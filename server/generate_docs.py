import sys
import os
import json
import traceback

def process_teacher_document(template_path, teacher_name, teacher_data, output_dir):
    try:
        # Import after path setup
        from generate_docs import process_teacher_document
        
        # Process the document
        pdf_buffer = process_teacher_document(template_path, teacher_name, teacher_data)
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        # Save to a temporary file
        import uuid
        output_file = os.path.join(output_dir, f"{uuid.uuid4()}.pdf")
        
        with open(output_file, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        return {
            'success': True,
            'output_file': output_file
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }

if __name__ == '__main__':
    try:
        template_path = sys.argv[1]
        teacher_name = sys.argv[2]
        teacher_data = json.loads(sys.argv[3])
        output_dir = sys.argv[4]
        
        result = process_teacher_document(template_path, teacher_name, teacher_data, output_dir)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }))
