const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const { initDatabase, getDatabase, closeDatabase } = require('./database.cjs');

let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

// ✅ Fonctions de chemin
const getPythonPath = () =>
  isDev
    ? path.join(__dirname, 'python', 'venv', 'Scripts', 'python.exe')
    : path.join(process.resourcesPath, 'python', 'venv', 'Scripts', 'python.exe');

const getPythonDir = () =>
  isDev ? path.join(__dirname, 'python') : path.join(process.resourcesPath, 'python');

const getIconPath = () =>
  isDev
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(process.resourcesPath, 'build', 'icon.ico');

// ✅ Dossiers utilisateur
const createAppDirectories = async () => {
  const userDataPath = app.getPath('userData');
  const uploadsDir = path.join(userDataPath, 'uploads');
  const savedPlanningsDir = path.join(userDataPath, 'saved_plannings');
  const pythonWorkspaceDir = path.join(userDataPath, 'python-workspace');

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(savedPlanningsDir, { recursive: true });
  await fs.mkdir(pythonWorkspaceDir, { recursive: true });

  console.log('✅ App directories created:', { uploadsDir, savedPlanningsDir, pythonWorkspaceDir });
  return { uploadsDir, savedPlanningsDir, pythonWorkspaceDir };
};

let appDirs;

// ✅ Création de la fenêtre
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = `file://${path.resolve(__dirname, '../dist/index.html').replace(/\\/g, '/')}`;
    mainWindow.loadURL(indexPath);

    // ✅ Gestion des routes manquantes
    mainWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedURL) => {
      if (errorCode === -6 || errorDescription.includes('ERR_FILE_NOT_FOUND')) {
        console.warn('⚠️ Route not found, reloading index.html:', validatedURL);
        await mainWindow.loadURL(indexPath);
      }
    });
  }


mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    // Initialiser les dossiers d'abord
    appDirs = await createAppDirectories();
    // Puis initialiser la base de données
    initDatabase();
    // Enfin créer la fenêtre
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  closeDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============================================================================
// GESTION DES FICHIERS
// ============================================================================

ipcMain.handle('select-file', async (event, fileType) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-uploaded-file', async (event, { fileName, filePath }) => {
  try {
    const destPath = path.join(appDirs.uploadsDir, fileName);
    await fs.copyFile(filePath, destPath);
    return { success: true, path: destPath };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// EXÉCUTION PYTHON - CORRIGÉE POUR LES PERMISSIONS
// ============================================================================

ipcMain.handle('run-python-algorithm', async (event, { teachersFile, wishesFile, examsFile, gradeHours }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pythonPath = getPythonPath();
      const pythonDir = getPythonDir();
      const scriptPath = path.join(pythonDir, 'main.py');

      // ✅ Vérification de l'existence de Python
      if (!fsSync.existsSync(pythonPath)) {
        const errorMsg = isDev
          ? 'Python environment not found. Please create virtual environment.'
          : 'Python environment not found in application resources.';
        reject(new Error(errorMsg));
        return;
      }

      console.log('Running Python script...');
      console.log('Python path:', pythonPath);
      console.log('Python dir:', pythonDir);
      console.log('Workspace dir:', appDirs.pythonWorkspaceDir);

      // ✅ Copier les fichiers d'entrée vers le workspace utilisateur
      try {
        const teachersDest = path.join(appDirs.pythonWorkspaceDir, 'Enseignants_participants.xlsx');
        const wishesDest = path.join(appDirs.pythonWorkspaceDir, 'Souhaits_avec_ids.xlsx');
        const examsDest = path.join(appDirs.pythonWorkspaceDir, 'Répartition_SE_dedup.xlsx');

        await fs.copyFile(teachersFile, teachersDest);
        await fs.copyFile(wishesFile, wishesDest);
        await fs.copyFile(examsFile, examsDest);

        console.log('✅ Input files copied to workspace');
      } catch (error) {
        reject(new Error(`Failed to copy input files: ${error.message}`));
        return;
      }

      // ✅ Préparer les arguments CORRIGÉS pour le script Python
      const args = [scriptPath];

      // ✅ Ajouter les heures par grade comme argument JSON si disponible
      if (gradeHours && Object.keys(gradeHours).length > 0) {
        const gradeHoursJson = JSON.stringify(gradeHours);
        args.push('--grade-hours');
        args.push(gradeHoursJson);
        console.log('Passing grade hours to Python:', gradeHoursJson);
      }

      // ❌ SUPPRIMÉ : L'argument --workspace-dir qui cause l'erreur
      // args.push('--workspace-dir');
      // args.push(appDirs.pythonWorkspaceDir);

      console.log('Python command:', pythonPath, args.join(' '));

      const pythonProcess = spawn(pythonPath, args, {
        cwd: appDirs.pythonWorkspaceDir, // ✅ Utiliser le workspace comme répertoire de travail
        env: {
          ...process.env,
          PYTHONPATH: pythonDir // ✅ Ajouter le chemin Python si nécessaire
        }
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('Python:', text);
        if (mainWindow) {
          mainWindow.webContents.send('python-log', text);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('Python Error:', text);
        if (mainWindow) {
          mainWindow.webContents.send('python-error', text);
        }
      });

      pythonProcess.on('close', async (code) => {
        console.log(`Python process exited with code ${code}`);

        if (code === 0) {
          // Vérifier le fichier de sortie dans le workspace
          const outputFile = path.join(appDirs.pythonWorkspaceDir, 'schedule_solution.xlsx');

          if (fsSync.existsSync(outputFile)) {
            const destPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');
            try {
              await fs.copyFile(outputFile, destPath);

              resolve({
                success: true,
                outputFile: destPath,
                logs: output
              });
            } catch (error) {
              reject(new Error(`Failed to copy output file: ${error.message}`));
            }
          } else {
            // Vérifier aussi dans le répertoire Python original
            const altOutputFile = path.join(pythonDir, 'schedule_solution.xlsx');
            if (fsSync.existsSync(altOutputFile)) {
              const destPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');
              try {
                await fs.copyFile(altOutputFile, destPath);
                resolve({
                  success: true,
                  outputFile: destPath,
                  logs: output
                });
              } catch (error) {
                reject(new Error(`Failed to copy output file: ${error.message}`));
              }
            } else {
              reject(new Error('Output file not generated. Check Python script for errors.'));
            }
          }
        } else {
          reject(new Error(`Python script failed: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

    } catch (error) {
      reject(new Error(`Setup error: ${error.message}`));
    }
  });
});
ipcMain.handle('read-excel-results', async (event, filePath) => {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    return { success: true, data };
  } catch (error) {
    console.error('Error reading Excel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-results-file', async (event) => {
  const sourcePath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');

  if (!fsSync.existsSync(sourcePath)) {
    return { success: false, error: 'No results file found' };
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'planning_surveillance.xlsx',
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  });

  if (!result.canceled && result.filePath) {
    try {
      await fs.copyFile(sourcePath, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Save cancelled' };
});

// ============================================================================
// GESTION DE L'HISTORIQUE (BASE DE DONNÉES)
// ============================================================================

// Sauvegarder une session de planning
ipcMain.handle('save-planning-session', async (event, { name, sessionType, semester, planningData }) => {
  try {
    const db = getDatabase();
    const year = new Date().getFullYear();

    // Calculer les statistiques
    const stats = {
      totalAssignments: planningData.length,
      teachersCount: new Set(planningData.map(r => r.Enseignant_ID)).size,
      examsCount: planningData.reduce((sum, r) => sum + (r.Nombre_Examens || 0), 0)
    };

    // Sauvegarder le fichier Excel
    const fileName = `${name}_${sessionType}_${semester}_${year}.xlsx`;
    const filePath = path.join(appDirs.savedPlanningsDir, fileName);

    const sourcePath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');
    if (fsSync.existsSync(sourcePath)) {
      await fs.copyFile(sourcePath, filePath);
    }

    // Insérer dans la base de données
    const insertSession = db.prepare(`
      INSERT INTO planning_sessions
      (name, session_type, semester, year, file_path, stats_total_assignments, stats_teachers_count, stats_exams_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertSession.run(
      name,
      sessionType,
      semester,
      year,
      filePath,
      stats.totalAssignments,
      stats.teachersCount,
      stats.examsCount
    );

    const sessionId = info.lastInsertRowid;

    // Insérer toutes les affectations AVEC les nouvelles colonnes
    const insertAssignment = db.prepare(`
      INSERT INTO planning_assignments
      (session_id, date, day_number, session, time_start, time_end, exam_count, teacher_id,
       grade, is_responsible, teacher_first_name, teacher_last_name, teacher_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((assignments) => {
      for (const assignment of assignments) {
        // Récupérer les informations de l'enseignant depuis les données
        const teacherFirstName = assignment['Prénom'] || assignment['prenom'] || '';
        const teacherLastName = assignment['Nom'] || assignment['nom'] || '';
        const teacherEmail = assignment['Email'] || assignment['email'] || '';
        const examCount = assignment['Nombre_Examens'] || 0;

        insertAssignment.run(
          sessionId,
          assignment.Date,
          assignment.Jour,
          assignment.Séance,
          assignment.Heure_Début,
          assignment.Heure_Fin,
          examCount,
          assignment.Enseignant_ID,
          assignment.Grade,
          assignment.Responsable,
          teacherFirstName,
          teacherLastName,
          teacherEmail
        );
      }
    });

    insertMany(planningData);

    console.log(`✅ Session ${sessionId} sauvegardée avec ${planningData.length} affectations`);

    return {
      success: true,
      sessionId,
      message: `Planning "${name}" sauvegardé avec succès`
    };
  } catch (error) {
    console.error('Error saving planning:', error);
    return { success: false, error: error.message };
  }
});

// Récupérer toutes les sessions
ipcMain.handle('get-all-sessions', async () => {
  try {
    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT * FROM planning_sessions
      ORDER BY created_at DESC
    `).all();

    return { success: true, sessions };
  } catch (error) {
    console.error('Error getting sessions:', error);
    return { success: false, error: error.message };
  }
});

// Récupérer une session spécifique avec ses données
ipcMain.handle('get-session-details', async (event, sessionId) => {
  try {
    console.log('Getting session details...');
    const db = getDatabase();
    const session = db.prepare(`
      SELECT * FROM planning_sessions WHERE id = ?
    `).get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const assignments = db.prepare(`
      SELECT * FROM planning_assignments WHERE session_id = ?
      ORDER BY date, session, exam_count
    `).all(sessionId);

    console.log(assignments.length);
    return {
      success: true,
      session,
      assignments
    };
  } catch (error) {
    console.error('Error getting session details:', error);
    return { success: false, error: error.message };
  }
});

// Supprimer une session
ipcMain.handle('delete-session', async (event, sessionId) => {
  try {
    const db = getDatabase();

    // Récupérer le chemin du fichier avant suppression
    const session = db.prepare('SELECT file_path FROM planning_sessions WHERE id = ?').get(sessionId);

    // Supprimer de la BDD (cascade supprimera aussi les assignments)
    db.prepare('DELETE FROM planning_sessions WHERE id = ?').run(sessionId);

    // Supprimer le fichier Excel si existe
    if (session && session.file_path && fsSync.existsSync(session.file_path)) {
      await fs.unlink(session.file_path);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message };
  }
});

// Exporter une session sauvegardée
ipcMain.handle('export-saved-session', async (event, sessionId) => {
  try {
    const db = getDatabase();
    const session = db.prepare('SELECT file_path, name FROM planning_sessions WHERE id = ?').get(sessionId);

    if (!session || !fsSync.existsSync(session.file_path)) {
      return { success: false, error: 'File not found' };
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${session.name}.xlsx`,
      filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
    });

    if (!result.canceled && result.filePath) {
      await fs.copyFile(session.file_path, result.filePath);
      return { success: true, path: result.filePath };
    }

    return { success: false, error: 'Export cancelled' };
  } catch (error) {
    console.error('Error exporting session:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// GÉNÉRATION DE DOCUMENTS WORD - CORRIGÉE POUR LES PERMISSIONS
// ============================================================================

ipcMain.handle('generate-global-documents', async (event) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pythonPath = getPythonPath();
      const pythonDir = getPythonDir();
      const scriptPath = path.join(pythonDir, 'generate_docs.py');
      const excelPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');

      if (!fsSync.existsSync(pythonPath)) {
        reject(new Error('Python environment not found'));
        return;
      }

      if (!fsSync.existsSync(excelPath)) {
        reject(new Error('No planning data found. Please generate a planning first.'));
        return;
      }

      console.log('Generating global documents...');

      // Copier le fichier Excel vers le workspace
      const workspaceExcelPath = path.join(appDirs.pythonWorkspaceDir, 'schedule_solution.xlsx');
      await fs.copyFile(excelPath, workspaceExcelPath);

      const pythonProcess = spawn(pythonPath, [scriptPath, 'global', workspaceExcelPath], {
        cwd: appDirs.pythonWorkspaceDir,
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python Error:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse result: ${output}`));
          }
        } else {
          reject(new Error(`Process failed: ${errorOutput}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Setup error: ${error.message}`));
    }
  });
});

ipcMain.handle('generate-teacher-document', async (event, teacherId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pythonPath = getPythonPath();
      const pythonDir = getPythonDir();
      const scriptPath = path.join(pythonDir, 'generate_docs.py');
      const excelPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');

      if (!fsSync.existsSync(pythonPath)) {
        reject(new Error('Python environment not found'));
        return;
      }

      if (!fsSync.existsSync(excelPath)) {
        reject(new Error('No planning data found'));
        return;
      }

      console.log(`Generating document for teacher ${teacherId}...`);

      // Copier le fichier Excel vers le workspace
      const workspaceExcelPath = path.join(appDirs.pythonWorkspaceDir, 'schedule_solution.xlsx');
      await fs.copyFile(excelPath, workspaceExcelPath);

      const pythonProcess = spawn(pythonPath, [scriptPath, 'teacher', workspaceExcelPath, teacherId], {
        cwd: appDirs.pythonWorkspaceDir,
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('Python stdout:', text);
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        console.log('Final stdout:', output);
        console.log('Final stderr:', errorOutput);

        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(result);
          } catch (e) {
            reject(new Error(`Failed to parse result: ${output}`));
          }
        } else {
          const errorMsg = errorOutput || output || 'No error output';
          reject(new Error(`Process exited with code ${code}: ${errorMsg}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Setup error: ${error.message}`));
    }
  });
});

// Ouvrir un fichier avec l'application par défaut
ipcMain.handle('open-file', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================================
// DASHBOARD STATISTICS
// ============================================================================

// Récupérer les statistiques de la dernière session
ipcMain.handle('get-dashboard-stats', async () => {
  try {
    const db = getDatabase();

    // Récupérer la dernière session
    const lastSession = db.prepare(`
      SELECT * FROM planning_sessions 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();

    if (!lastSession) {
      return {
        success: true,
        hasData: false,
        message: 'Aucune session trouvée'
      };
    }

    // Récupérer toutes les affectations de cette session
    const assignments = db.prepare(`
      SELECT * FROM planning_assignments 
      WHERE session_id = ?
    `).all(lastSession.id);

    // Statistiques par grade
    const statsByGrade = db.prepare(`
      SELECT 
        grade,
        COUNT(DISTINCT teacher_id) as teacher_count,
        COUNT(*) as total_assignments,
        SUM(CASE WHEN is_responsible = 'Oui' THEN 1 ELSE 0 END) as responsible_count
      FROM planning_assignments
      WHERE session_id = ?
      GROUP BY grade
      ORDER BY grade
    `).all(lastSession.id);

    // Calculer les heures par grade (en supposant 3h par séance)
    const hoursByGrade = statsByGrade.map(stat => ({
      ...stat,
      total_hours: stat.total_assignments * 3
    }));

    // Top 5 enseignants les plus sollicités
    const topTeachers = db.prepare(`
      SELECT 
        teacher_id,
        teacher_first_name,
        teacher_last_name,
        teacher_email,
        grade,
        COUNT(*) as assignment_count,
        COUNT(*) * 3 as total_hours
      FROM planning_assignments
      WHERE session_id = ?
      GROUP BY teacher_id
      ORDER BY assignment_count DESC
      LIMIT 5
    `).all(lastSession.id);

    // Répartition par jour
    const assignmentsByDay = db.prepare(`
      SELECT 
        date,
        day_number,
        COUNT(DISTINCT teacher_id) as teacher_count,
        COUNT(*) as assignment_count
      FROM planning_assignments
      WHERE session_id = ?
      GROUP BY date, day_number
      ORDER BY day_number
    `).all(lastSession.id);

    // Répartition par séance (Matin/Après-midi)
    const assignmentsBySession = db.prepare(`
      SELECT 
        session,
        COUNT(*) as count,
        COUNT(DISTINCT teacher_id) as unique_teachers
      FROM planning_assignments
      WHERE session_id = ?
      GROUP BY session
      ORDER BY session
    `).all(lastSession.id);

    // Statistiques des examens
    const examStats = db.prepare(`
      SELECT 
        exam_count,
        COUNT(*) as usage_count,
        COUNT(DISTINCT date) as days_used
      FROM planning_assignments
      WHERE session_id = ?
      GROUP BY exam_count
      ORDER BY usage_count DESC
      LIMIT 10
    `).all(lastSession.id);

    // Enseignants sans affectation (si vous avez une table d'enseignants)
    const uniqueTeachers = new Set(assignments.map(a => a.teacher_id)).size;
    const teachersWithResponsibility = db.prepare(`
      SELECT COUNT(DISTINCT teacher_id) as count
      FROM planning_assignments
      WHERE session_id = ? AND is_responsible = 'Oui'
    `).get(lastSession.id);

    return {
      success: true,
      hasData: true,
      session: {
        id: lastSession.id,
        name: lastSession.name,
        sessionType: lastSession.session_type,
        semester: lastSession.semester,
        year: lastSession.year,
        createdAt: lastSession.created_at
      },
      overview: {
        totalAssignments: assignments.length,
        uniqueTeachers: uniqueTeachers,
        totalExams: new Set(assignments.map(a => a.exam_id)).size,
        totalDays: new Set(assignments.map(a => a.date)).size,
        teachersWithResponsibility: teachersWithResponsibility.count,
        totalHours: assignments.length * 3 // 3h par séance
      },
      statsByGrade: hoursByGrade,
      topTeachers,
      assignmentsByDay,
      assignmentsBySession,
      examStats: examStats
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// PERMUTATION D'ENSEIGNANTS - CORRIGÉE POUR LES PERMISSIONS
// ============================================================================

ipcMain.handle('swap-teachers', async (event, { teacher1, teacher2 }) => {
  try {
    const db = getDatabase();
    const XLSX = require('xlsx');

    console.log(`🔄 Swap Teachers:`);
    console.log(`Teacher 1: ${teacher1.id} at Jour ${teacher1.day}/${teacher1.session}`);
    console.log(`Teacher 2: ${teacher2.id} at Jour ${teacher2.day}/${teacher2.session}`);

    // 1. Get the latest session
    const lastSession = db.prepare(`
      SELECT id FROM planning_sessions 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();

    if (!lastSession) {
      return { success: false, error: 'Aucune session trouvée' };
    }

    const sessionId = lastSession.id;

    // 2. Get teacher data from database
    const teacher1Data = db.prepare(`
      SELECT * FROM planning_assignments
      WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
    `).get(sessionId, teacher1.id, teacher1.day, teacher1.session);

    const teacher2Data = db.prepare(`
      SELECT * FROM planning_assignments
      WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
    `).get(sessionId, teacher2.id, teacher2.day, teacher2.session);

    if (!teacher1Data || !teacher2Data) {
      return { success: false, error: 'Impossible de trouver les affectations' };
    }

    // 3. Swap in database using transaction
    const swapTransaction = db.transaction(() => {
      // Step 1: Set teacher 1's slot to temp
      db.prepare(`
        UPDATE planning_assignments
        SET teacher_id = 'TEMP_SWAP', teacher_first_name = ?, teacher_last_name = ?, teacher_email = ?, grade = ?
        WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
      `).run(
        'TEMP', 'SWAP', 'temp@swap.com', 'TEMP',
        sessionId, teacher1.id, teacher1.day, teacher1.session
      );

      // Step 2: Update teacher 1's slot (now TEMP) with teacher 2's info
      db.prepare(`
        UPDATE planning_assignments
        SET teacher_id = ?, teacher_first_name = ?, teacher_last_name = ?, teacher_email = ?, grade = ?
        WHERE session_id = ? AND teacher_id = 'TEMP_SWAP' AND day_number = ? AND session = ?
      `).run(
        teacher2Data.teacher_id,
        teacher2Data.teacher_first_name,
        teacher2Data.teacher_last_name,
        teacher2Data.teacher_email,
        teacher2Data.grade,
        sessionId, teacher1.day, teacher1.session
      );

      // Step 3: Update teacher 2's slot with teacher 1's info
      db.prepare(`
        UPDATE planning_assignments
        SET teacher_id = ?, teacher_first_name = ?, teacher_last_name = ?, teacher_email = ?, grade = ?
        WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
      `).run(
        teacher1Data.teacher_id,
        teacher1Data.teacher_first_name,
        teacher1Data.teacher_last_name,
        teacher1Data.teacher_email,
        teacher1Data.grade,
        sessionId, teacher2.id, teacher2.day, teacher2.session
      );
    });

    const teacher1Data2 = db.prepare(
      `SELECT * FROM planning_assignments WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?`
    ).get(sessionId, teacher1.id, teacher2.day, teacher2.session);
    console.log(teacher1Data2);
    const teacher2Data2 = db.prepare(
      `SELECT * FROM planning_assignments WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?`
    ).get(sessionId, teacher2.id, teacher1.day, teacher1.session);
    console.log(teacher2Data2);
    swapTransaction();
    console.log('✅ Database updated');

    // 4. Update Excel file in user data directory
    const excelPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');

    if (fsSync.existsSync(excelPath)) {
      // Read current Excel data
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Swap teachers in Excel data
      const updatedData = jsonData.map(row => {
        // Teacher 1's slot gets Teacher 2's info
        if (row.Enseignant_ID === teacher1.id &&
          row.Jour === teacher1.day &&
          row.Séance === teacher1.session) {
          return {
            ...row,
            Enseignant_ID: teacher2Data.teacher_id,
            Nom: teacher2Data.teacher_last_name,
            Prénom: teacher2Data.teacher_first_name,
            Email: teacher2Data.teacher_email,
            Grade: teacher2Data.grade
          };
        }

        // Teacher 2's slot gets Teacher 1's info
        if (row.Enseignant_ID === teacher2.id &&
          row.Jour === teacher2.day &&
          row.Séance === teacher2.session) {
          return {
            ...row,
            Enseignant_ID: teacher1Data.teacher_id,
            Nom: teacher1Data.teacher_last_name,
            Prénom: teacher1Data.teacher_first_name,
            Email: teacher1Data.teacher_email,
            Grade: teacher1Data.grade
          };
        }

        return row;
      });

      // Write updated data back to Excel
      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Planning');
      XLSX.writeFile(newWorkbook, excelPath);
      console.log('✅ Excel file updated');
    }

    return {
      success: true,
      message: 'Permutation effectuée avec succès'
    };

  } catch (error) {
    console.error('Error swapping teachers:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// CHANGEMENT DE CRÉNEAU POUR UN ENSEIGNANT - CORRIGÉE POUR LES PERMISSIONS
// ============================================================================

ipcMain.handle('change-teacher-slot', async (event, { teacher, fromSlot, toSlot }) => {
  try {
    const db = getDatabase();
    const XLSX = require('xlsx');

    console.log(`🔄 Change Teacher Slot:`);
    console.log(`Teacher: ${teacher.id} from Jour ${fromSlot.day}/${fromSlot.session} to Jour ${toSlot.day}/${toSlot.session}`);

    // 1. Get the latest session
    const lastSession = db.prepare(`
      SELECT id FROM planning_sessions 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();

    if (!lastSession) {
      return { success: false, error: 'Aucune session trouvée' };
    }

    const sessionId = lastSession.id;

    // 2. Get teacher's current assignment
    const currentAssignment = db.prepare(`
      SELECT * FROM planning_assignments
      WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
    `).get(sessionId, teacher.id, fromSlot.day, fromSlot.session);

    if (!currentAssignment) {
      return { success: false, error: 'Affectation actuelle introuvable' };
    }

    // 3. Get target slot info (to get date, time, exam count)
    const targetSlotInfo = db.prepare(`
      SELECT date, time_start, time_end, exam_count FROM planning_assignments
      WHERE session_id = ? AND day_number = ? AND session = ?
      LIMIT 1
    `).get(sessionId, toSlot.day, toSlot.session);

    if (!targetSlotInfo) {
      return { success: false, error: 'Créneau cible introuvable' };
    }

    // 4. Delete old assignment and insert new one
    const changeTransaction = db.transaction(() => {
      // Delete from old slot
      db.prepare(`
        DELETE FROM planning_assignments
        WHERE session_id = ? AND teacher_id = ? AND day_number = ? AND session = ?
      `).run(sessionId, teacher.id, fromSlot.day, fromSlot.session);

      // Insert into new slot
      db.prepare(`
        INSERT INTO planning_assignments
        (session_id, date, day_number, session, time_start, time_end, exam_count, teacher_id,
         grade, is_responsible, teacher_first_name, teacher_last_name, teacher_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sessionId,
        targetSlotInfo.date,
        toSlot.day,
        toSlot.session,
        targetSlotInfo.time_start,
        targetSlotInfo.time_end,
        targetSlotInfo.exam_count,
        currentAssignment.teacher_id,
        currentAssignment.grade,
        currentAssignment.is_responsible,
        currentAssignment.teacher_first_name,
        currentAssignment.teacher_last_name,
        currentAssignment.teacher_email
      );
    });

    changeTransaction();
    console.log('✅ Database updated');

    // 5. Update Excel file in user data directory
    const excelPath = path.join(app.getPath('userData'), 'schedule_solution.xlsx');

    if (fsSync.existsSync(excelPath)) {
      // Read current Excel data
      const workbook = XLSX.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Remove teacher from old slot and add to new slot
      const updatedData = jsonData.filter(row =>
        !(row.Enseignant_ID === teacher.id &&
          row.Jour === fromSlot.day &&
          row.Séance === fromSlot.session)
      );

      // Find a row from the target slot to get the correct date/time info
      const targetSlotRow = jsonData.find(row =>
        row.Jour === toSlot.day && row.Séance === toSlot.session
      );

      if (targetSlotRow) {
        // Add teacher to new slot
        updatedData.push({
          Date: targetSlotRow.Date,
          Jour: toSlot.day,
          Séance: toSlot.session,
          Heure_Début: targetSlotRow.Heure_Début,
          Heure_Fin: targetSlotRow.Heure_Fin,
          Nombre_Examens: targetSlotRow.Nombre_Examens,
          Enseignant_ID: currentAssignment.teacher_id,
          Nom: currentAssignment.teacher_last_name,
          Prénom: currentAssignment.teacher_first_name,
          Email: currentAssignment.teacher_email,
          Grade: currentAssignment.grade,
          Responsable: currentAssignment.is_responsible
        });
      }

      // Write updated data back to Excel
      const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
      const newWorkbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Planning');
      XLSX.writeFile(newWorkbook, excelPath);
      console.log('✅ Excel file updated');
    }

    return {
      success: true,
      message: 'Changement effectué avec succès'
    };

  } catch (error) {
    console.error('Error changing teacher slot:', error);
    return { success: false, error: error.message };
  }
});