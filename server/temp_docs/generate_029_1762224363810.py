
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
    template_path = r'C:\\Users\\User\\Desktop\\Secret_File\\Exam-Monitoring-for-ISI-Administration\\electron\\python\\Convocation.docx'
    teacher_name = 'Zouhour Ben Azzouz'
    teacher_data = {"27/10/2025":[["08:30","10:00",1.5],["10:30","12:00",1.5],["12:30","14:00",1.5]],"28/10/2025":[["08:30","10:00",1.5],["10:30","12:00",1.5],["12:30","14:00",1.5],["14:30","16:00",1.5]]}
    
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
