import dotenv from 'dotenv';
import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

import { promisify } from 'util';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

import { promises as fs } from 'fs';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { createWriteStream } from 'fs';

import { exec } from 'child_process';
// Load environment variables FIRST
const envPath = resolve(process.cwd(), '.env');
console.log('Loading .env from:', envPath);

// Load .env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Environment variables loaded successfully');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pipelineAsync = promisify(pipeline);
// Create the execPromise function
const execPromise = promisify(exec);
// Debug: Check if environment variables are loaded
console.log('Current working directory:', process.cwd());
console.log('Environment variables:');
console.log('- SMTP_HOST:', process.env.SMTP_HOST || 'Not set');
console.log('- SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
console.log('- SMTP_PASS:', process.env.SMTP_PASS ? 'Set' : 'Not set');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Configure SMTP transport
const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('Missing required SMTP configuration in .env file');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // Only for development with self-signed certificates
      rejectUnauthorized: process.env.NODE_ENV !== 'development'
    }
  });
};

// Email sending endpoint
app.post('/api/send-emails', async (req, res) => {

  console.log('Received request with body:', req.body);
  const transporter = createTransporter();
  const { teachers = [ ] } = req.body;

  // Input validation
  if (!Array.isArray(teachers) ) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body. Expected teachers and sessions arrays.'
    });
  }

  // Process emails with rate limiting
  const BATCH_SIZE = 5; // Process 5 emails at a time
  const results = [];

  for (let i = 0; i < teachers.length; i += BATCH_SIZE) {
    const batch = teachers.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(teacher => sendTeacherEmail(teacher, transporter))
    );
    results.push(...batchResults);
    
    // Add delay between batches (1 second)
    if (i + BATCH_SIZE < teachers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate summary
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  return res.json({
    success: failed === 0,
    summary: {
      total: results.length,
      successful,
      failed,
      timestamp: new Date().toISOString()
    },
    results
  });
});

// Helper function to send email to a single teacher
async function sendTeacherEmail(teacher, transporter) {
  const { email, firstName, lastName , sessions } = teacher;
  const teacherSessions = sessions;
  const teacherName = `${firstName} ${lastName}`;

  try {
    // Validate teacher data
    if (!email || !firstName || !lastName) {
      throw new Error('Missing required teacher information');
    }

    if (teacherSessions.length === 0) {
      throw new Error('No sessions found for this teacher');
    }

    // Format email content
    const emailContent = {
      from: `"Administration ISI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Votre convocation pour la surveillance des examens',
      text: createEmailText(teacherName, teacherSessions),
      html: createEmailHtml(teacherName, teacherSessions)
    };

    // Add attachments if needed
    if (process.env.ATTACH_DOCUMENTS === 'true') {
      emailContent.attachments = [{
        filename: `convocation_${lastName}_${firstName}.pdf`,
        content: await generatePdf(teacher)
      }];
    }

    // Send email
    const info = await transporter.sendMail(emailContent);
    
    return {
      success: true,
      email,
      name: teacherName,
      messageId: info.messageId,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error(`Error sending email to ${email}:`, error);
    return {
      success: false,
      email,
      name: teacherName,
      error: error.message,
      message: 'Failed to send email'
    };
  }
}

// Helper functions for email content
function createEmailText(teacherName, sessions) {
  return `Bonjour ${teacherName},

Veuillez trouver ci-joint votre convocation pour la surveillance des examens.

Détails de vos sessions de surveillance:
${sessions.map(s => 
  `- ${s.date} de ${s.startTime} à ${s.endTime} (${s.duration.toFixed(1)}h) - ${s.session || ''}`
).join('\n')}

Cordialement,
L'administration`;
}

function createEmailHtml(teacherName, sessions) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Bonjour ${teacherName},</h2>
      <p>Veuillez trouver ci-joint votre convocation pour la surveillance des examens.</p>
      
      <h3 style="color: #2c3e50; margin-top: 20px;">Détails de vos sessions :</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #ddd;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Horaire</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Durée</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Session</th>
          </tr>
        </thead>
        <tbody>
          ${sessions.map(session => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${session.date}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${session.startTime} - ${session.endTime}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${session.duration.toFixed(1)}h</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${session.session || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p style="margin-top: 20px;">Cordialement,<br>L'administration</p>
    </div>
  `;
}


async function generateTeacherPDF(teacher) {
  try {
     // Use the imported path functions
    const templatePath = join(__dirname, '..', 'electron', 'python', 'Convocation.docx');
    const tempDocsDir = join(__dirname, 'temp_docs');

   // Create temp directory if it doesn't exist
    if (!existsSync(tempDocsDir)) {
      mkdirSync(tempDocsDir, { recursive: true });
    }

    // Format the data for the Python function
    const sessionsByDate = {};
    (teacher.sessions || []).forEach(session => {
      const dateKey = session.date;
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = [];
      }
      sessionsByDate[dateKey].push([
        session.startTime,
        session.endTime,
        session.duration
      ]);
    });

    const teacherData = sessionsByDate;
    const teacherFullName = `${teacher.firstName} ${teacher.lastName}`;

    console.log(`Generating PDF for: ${teacherFullName}`);

    // Verify template exists
    if (!existsSync(templatePath)) {
      throw new Error(`Template file not found at: ${templatePath}`);
    }

    // Create a temporary Python script
  // Create a temporary Python script
  console.log("problem1");
const tempScriptPath = join(tempDocsDir, `generate_${teacher.id}_${Date.now()}.py`);
const toPythonPath = (p) => p.replace(/\\/g, '\\\\');  // Helper to format Windows paths for Python
console.log("problem2");
const pythonScript = `
import sys
import os
import json
import base64
import traceback

# Add the parent directory to Python path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(script_dir)))

try:
    from generate_docs import process_teacher_document
    
    # Input data
    template_path = r'${toPythonPath(templatePath)}'
    teacher_name = '${teacherFullName.replace(/'/g, "''")}'
    teacher_data = ${JSON.stringify(teacherData)}
    
    # Generate PDF
    pdf_buffer = process_teacher_document(template_path, teacher_name, teacher_data)
    
    # Return result as base64
    result = {
        'success': True,
        'pdf_buffer': base64.b64encode(pdf_buffer.getvalue()).decode('utf-8'),
        'teacher_name': teacher_name
    }
    print(json.dumps(result))
    
except Exception as e:
    result = {
        'success': False,
        'error': str(e),
        'traceback': traceback.format_exc()
    }
    print(json.dumps(result), file=sys.stderr)
    sys.exit(1)
`;
console.log("catch you !!")
    // Write the Python script
    writeFileSync(tempScriptPath, pythonScript);
    
    try {
      // Execute Python script
      const command = `python "${tempScriptPath}"`;
      const { stdout, stderr } = await execPromise(command, { 
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        env: { 
          ...process.env, 
          PYTHONIOENCODING: 'utf-8',
          PYTHONPATH: join(__dirname, '..', 'electron', 'python')
        }
      });

      if (stderr) {
        console.warn(`Python warnings for ${teacherFullName}:`, stderr);
      }

      // Parse the result
      const result = JSON.parse(stdout.trim());

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PDF');
      }

      if (!result.pdf_buffer) {
        throw new Error('No PDF buffer returned from Python script');
      }

      // Convert base64 to Buffer
      const pdfBuffer = Buffer.from(result.pdf_buffer, 'base64');
      
      console.log(`✅ PDF generated successfully for ${teacherFullName} (${pdfBuffer.length} bytes)`);
      
      return pdfBuffer;
      
    } finally {
      // Clean up the temporary script
      try {
        if (existsSync(tempScriptPath)) {
          unlinkSync(tempScriptPath);
        }
      } catch (cleanupError) {
        console.warn(`Failed to cleanup temp script: ${cleanupError.message}`);
      }
    }
    
  } catch (error) {
    console.error(`Error generating PDF for ${teacher.firstName} ${teacher.lastName}:`, error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

// Usage in your email endpoint:
app.post('/api/send-emails', async (req, res) => {
  try {
    const { teachers } = req.body;
    
    if (!teachers || !Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Aucun enseignant spécifié' 
      });
    }

    console.log(`Processing ${teachers.length} teachers`);
    
    const results = await Promise.allSettled(teachers.map(async (teacher) => {
      try {
        const { id, email, firstName, lastName, sessions } = teacher;
        
        // Validate required fields
        if (!id || !email || !firstName || !lastName) {
          throw new Error('Informations enseignant incomplètes');
        }

        if (!sessions || sessions.length === 0) {
          throw new Error('Aucune session de surveillance assignée');
        }

        console.log(`Processing: ${firstName} ${lastName} (${email})`);
        
        // Generate PDF
        const pdfBuffer = await generateTeacherPDF(teacher);
        
        // Format sessions for email
        const formatSession = (session) => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${session.date}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${session.startTime} - ${session.endTime}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${session.duration.toFixed(1)}h</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${session.session || 'N/A'}</td>
          </tr>
        `;

        // Prepare email
        const mailOptions = {
          from: `"Administration ISI" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Convocation - Surveillance des examens',
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
              <p>Bonjour ${firstName} ${lastName},</p>
              <p>Veuillez trouver ci-joint votre convocation pour la surveillance des examens.</p>
              
              <h3>Détails de vos sessions de surveillance :</h3>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background-color: #f5f5f5;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Date</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Horaire</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Durée</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Session</th>
                  </tr>
                </thead>
                <tbody>
                  ${sessions.map(formatSession).join('')}
                </tbody>
              </table>
              
              <p>Cordialement,<br>L'administration</p>
            </div>
          `,
          attachments: [
            {
              filename: `convocation_${id}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        };
        
        // Send email
        console.log(`Sending email to: ${email}`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${email}: ${info.messageId}`);
        
        return {
          success: true,
          email: email,
          name: `${firstName} ${lastName}`,
          messageId: info.messageId
        };
        
      } catch (error) {
        console.error(`❌ Error for ${teacher.email}:`, error.message);
        return {
          success: false,
          email: teacher.email,
          name: `${teacher.firstName} ${teacher.lastName}`,
          error: error.message
        };
      }
    }));

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`\n📊 Summary: ${successful} successful, ${failed} failed`);
    
    res.json({ 
      success: true,
      summary: {
        total: teachers.length,
        successful,
        failed
      },
      results: results.map(r => r.status === 'fulfilled' ? r.value : { 
        success: false, 
        error: r.reason?.message || 'Unknown error' 
      })
    });
    
  } catch (error) {
    console.error('Error in /api/send-emails:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'envoi des emails',
      details: error.message
    });
  }
});




// Helper function to generate PDF (placeholder - implement your PDF generation logic)
async function generatePdf(teacherdata) {
  
   const pdfBuffer = await generateTeacherPDF(teacherdata)
   return pdfBuffer
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // You might want to restart the server or perform cleanup here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Perform cleanup and exit
  process.exit(1);
});