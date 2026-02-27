import logging
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.pdf_parser import extract_text_from_pdf, split_into_clauses
from app.ollama_client import call_ollama
from app.rules_engine import evaluate_clause_with_rules, calculate_overall_risk

# Configure logging to show when models load
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Contract Risk Analyzer API")

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("FastAPI server starting... (Heavy ML models are deferred until needed)")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Contract Risk Analyzer API. Use /analyze to analyze contracts."}

@app.post("/analyze")
async def analyze_contract(
    file: UploadFile = File(...),
    role: str = Form(...),
    jurisdiction: str = Form(...)
):
    """
    Endpoint to analyze a contract file (PDF) for risks.
    Accepts role (tenant/employee/freelancer) and jurisdiction (India/California).
    """
    
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    # Validate role
    valid_roles = ["tenant", "employee", "freelancer"]
    if role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(valid_roles)}")
        
    # Validate jurisdiction
    valid_jurisdictions = ["india", "california"]
    if jurisdiction.lower() not in valid_jurisdictions:
        raise HTTPException(status_code=400, detail=f"Jurisdiction must be one of: {', '.join(valid_jurisdictions)}")

    # Read file content (basic validation that it can be read)
    try:
        content = await file.read()
        file_size = len(content)
        
        # Extract text from PDF
        logger.info("Extracting text from PDF...")
        extracted_text = await extract_text_from_pdf(content)
        
        # Split text into clauses
        logger.info("Splitting text into individual clauses...")
        clauses = split_into_clauses(extracted_text)
        logger.info(f"Generated {len(clauses)} clauses for analysis.")

        # Bypass RAG as requested to analyze all clauses
        results = []
        for i, clause_text in enumerate(clauses):
            logger.info(f"Processing clause {i+1}/{len(clauses)}...")
            
            # 1. Apply Rule Engine first
            rule_result = evaluate_clause_with_rules(clause_text)
            
            if rule_result:
                logger.info(f"Rule triggered for clause {i+1}: {rule_result['risk_level']}")
                results.append(rule_result)
            else:
                # 2. Fall back to LLM analysis
                logger.debug(f"No rules triggered, sending clause {i+1} to LLM...")
                llm_result = await call_ollama(clause_text, role, jurisdiction)
                results.append(llm_result)

        # Calculate overall risk
        overall_risk = calculate_overall_risk(results)
        
        logger.info(f"Total clauses processed: {len(clauses)}")
        logger.info(f"Total results generated: {len(results)}")
        logger.info(f"Analysis complete. Overall risk: {overall_risk}. Returning {len(results)} clauses.")
        
        # Return structured JSON matching requirements exactly
        return {
            "overall_risk": overall_risk,
            "overall_risk_score": overall_risk,  # Included for backwards compatibility with React frontend
            "clauses": results
        }
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Uvicorn run command:
    # uvicorn main:app --reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
