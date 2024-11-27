import os
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import requests
import PyPDF2
from dotenv import load_dotenv
import tempfile
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # Max file size 5 MB
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

API_KEY = os.getenv('GROCQ_API_KEY')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_pdf_content(file_path):
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            content = ""
            for page in reader.pages:
                content += page.extract_text()
            return content
    except Exception as e:
        raise ValueError(f"Error reading PDF file: {str(e)}")


def analyze_resume(resume_content, job_description):
    try:
        messages = [
           
            {"content": f"Resume Content: {resume_content}", "role": "user"},
            {"content": f"Job Description: {job_description}", "role": "user"},
            {"content": (
                "You are an advanced resume analyzer AI. Your job is to read the job description and then compare it with the resume to provide a score and recommendations. If the job description is not a proper job description you must return 0. The score must be an integer between the ranges of 0 to 100. \n"
                "Provide a JSON response with the following structure: \n"
                "{\n"
                "  'score': number between 0-100,\n"
                "  'highlights': [list of resume strengths],\n"
                "  'recommendations': [list of improvement suggestions]\n"
                "}"
            ),
            "role": "system"},

        ]

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions", 
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.2-90b-vision-preview",  
                "messages": messages,
                "temperature": 0.2,
                "max_tokens": 500,
                "top_p": 1,
                "response_format": {"type": "json_object"},
                "stream": False,
            },
        )

        if response.status_code == 200:
            response_json = response.json()
            analysis_content = response_json['choices'][0]['message']['content']
            
            try:
                analysis_data = json.loads(analysis_content)
                return analysis_data
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON response from AI")
        else:
            raise ValueError(f"API returned an error: {response.status_code} {response.text}")
    except Exception as e:
        raise ValueError(f"Error during resume analysis: {str(e)}")


@app.route('/upload', methods=['POST'])
def upload_resume():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'}), 400

        file = request.files['file']
        job_description = request.form.get('jobDescription', '').strip()

        if not file or not allowed_file(file.filename):
            return jsonify({'success': False, 'message': 'Invalid file type. Only PDF files are allowed.'}), 400

        if not job_description:
            return jsonify({'success': False, 'message': 'Job description is required.'}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            resume_content = extract_pdf_content(file_path)

            analysis_result = analyze_resume(resume_content, job_description)

            return jsonify({
                'success': True,
                'analysis': analysis_result
            })
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)

    except ValueError as ve:
        return jsonify({'success': False, 'message': str(ve)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': 'An unexpected error occurred'}), 500


@app.route('/download-analysis', methods=['POST'])
def download_analysis():
    try:
        data = request.json
        analysis_result = data.get('analysis_result', {})

        # Generate a PDF report
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            doc = SimpleDocTemplate(temp_file.name, pagesize=letter)
            styles = getSampleStyleSheet()

            elements = []
            elements.append(Paragraph('Analysis Result', styles['Heading1']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph(f"Resume Score: {analysis_result.get('score', 'N/A')}", styles['BodyText']))
            elements.append(Spacer(1, 12))

            if 'highlights' in analysis_result:
                elements.append(Paragraph('Highlights:', styles['Heading2']))
                for highlight in analysis_result['highlights']:
                    elements.append(Paragraph(highlight, styles['BodyText']))
                elements.append(Spacer(1, 12))

            if 'recommendations' in analysis_result:
                elements.append(Paragraph('Recommendations:', styles['Heading2']))
                for recommendation in analysis_result['recommendations']:
                    elements.append(Paragraph(recommendation, styles['BodyText']))

            doc.build(elements)

            return send_file(temp_file.name, as_attachment=True, download_name='analysis_result.pdf')
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=4000)
