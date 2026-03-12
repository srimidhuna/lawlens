# LawLens

A full-stack application for analyzing contract risks using AI.

## Project Structure

```
ai-contract-risk-analyzer/
├── backend/                  # FastAPI backend
│   ├── app/                  # Application code
│   │   ├── api/              # API routes
│   │   ├── core/             # Core configurations
│   │   ├── services/         # Business logic (AI processing)
│   │   └── main.py           # FastAPI entry point
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React frontend
│   ├── public/               # Public assets
│   ├── src/                  # Source code
│   │   ├── assets/           # Images, fonts, etc.
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API calls
│   │   ├── App.jsx           # Main React component
│   │   ├── main.jsx          # React entry point
│   │   └── index.css         # Tailwind base styles
│   ├── package.json          # Node dependencies
│   ├── postcss.config.js     # PostCSS config for Tailwind
│   ├── tailwind.config.js    # Tailwind CSS config
│   └── vite.config.js        # Vite config
└── README.md                 # Project documentation
```

## Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- [Ollama](https://ollama.ai/) installed locally for running language models

### Scanned PDF Support (OCR)

The PDF text extraction uses a 3-tier pipeline:

- **Tier 1 — pdfplumber**: Works automatically for digital/text-based PDFs. No extra setup needed.
- **Tier 2 — Llama 4 Scout Vision**: Uses the existing `GROQ_API_KEY` (already in your `.env`) with no extra setup needed. Activates automatically when pdfplumber returns insufficient text from a scanned PDF.
- **Tier 3 — pytesseract (optional offline fallback)**: Only used if the Groq API is unavailable. Requires system-level OCR dependencies:
  - **Ubuntu/Debian**: `sudo apt-get install tesseract-ocr poppler-utils`
  - **macOS**: `brew install tesseract poppler`
  - **Windows**: Install [Tesseract OCR](https://github.com/UB-Mannheim/tesseract) and [Poppler](https://github.com/oschwartz10612/poppler-windows) from GitHub

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

5. Install and pull an Ollama model (e.g., Llama 3 or Mistral):
   ```bash
   ollama pull mistral
   ```

6. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` and the backend API documentation will be at `http://localhost:8000/docs`.
