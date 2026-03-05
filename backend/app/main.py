import logging
import asyncio
import httpx
import json
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
from pydantic import BaseModel
from app.pdf_parser import extract_text_from_pdf, split_into_clauses
from app.ollama_client import call_ollama, GROQ_API_URL, GROQ_API_KEY
from app.rules_engine import evaluate_clause_with_rules, calculate_overall_risk

# Configure logging to show when models load
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="LawLens API")

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
    return {"message": "Welcome to the LawLens API. Use /analyze to analyze contracts."}

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
    valid_jurisdictions = ["india", "california", "new_york", "texas", "united_kingdom", "canada", "australia", "singapore", "uae", "germany", "south_africa"]
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

        # Process clauses: rules engine first, then batch LLM calls in parallel
        results = [None] * len(clauses)
        llm_pending = []  # (index, clause_text) pairs needing LLM

        for i, clause_text in enumerate(clauses):
            rule_result = evaluate_clause_with_rules(clause_text)
            if rule_result:
                logger.info(f"Rule triggered for clause {i+1}: {rule_result['risk_level']}")
                results[i] = rule_result
            else:
                llm_pending.append((i, clause_text))

        # Process LLM clauses in parallel batches of 5
        BATCH_SIZE = 5
        logger.info(f"Sending {len(llm_pending)} clauses to Groq API in parallel...")
        for batch_start in range(0, len(llm_pending), BATCH_SIZE):
            batch = llm_pending[batch_start:batch_start + BATCH_SIZE]
            logger.info(f"Processing batch {batch_start // BATCH_SIZE + 1} ({len(batch)} clauses)...")
            
            tasks = [call_ollama(ct, role, jurisdiction) for _, ct in batch]
            batch_results = await asyncio.gather(*tasks)
            
            for (idx, _), result in zip(batch, batch_results):
                results[idx] = result

        # Calculate overall risk
        overall_result = calculate_overall_risk(results)
        overall_risk = overall_result["level"]
        avg_score = overall_result["avg_score"]
        
        logger.info(f"Total clauses processed: {len(clauses)}")
        logger.info(f"Total results generated: {len(results)}")
        logger.info(f"Analysis complete. Overall risk: {overall_risk} (avg score: {avg_score}/10). Returning {len(results)} clauses.")
        
        # Return structured JSON matching requirements exactly
        return {
            "overall_risk": overall_risk,
            "overall_risk_score": overall_risk,  # Included for backwards compatibility with React frontend
            "overall_risk_score_numeric": avg_score,
            "clauses": results,
            "extracted_text": extracted_text
        }
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# --- Contract Summary Endpoint ---

class SummaryRequest(BaseModel):
    contract_text: str

@app.post("/contract-summary")
async def contract_summary(req: SummaryRequest):
    """
    Generate a structured summary of the entire contract using AI.
    """
    if not req.contract_text.strip():
        raise HTTPException(status_code=400, detail="Contract text cannot be empty.")

    # Truncate to first 6000 chars to stay within token limits
    text = req.contract_text[:6000]

    prompt = f"""You are a legal assistant. Summarize the following contract in simple language for non-lawyers.

Return a short structured summary with:
- Contract Type (e.g., Employment Agreement, Rental Agreement, Freelancer Agreement, Service Agreement)
- Parties Involved (if detectable from the text)
- Key Obligations (1-2 sentences)
- Payment Terms (1-2 sentences)
- Termination Conditions (1-2 sentences)
- Overall Risk Level (Low / Medium / High)

CONTRACT TEXT:
{text}

Provide the output EXCLUSIVELY in valid JSON format matching this exact structure:
{{
  "contract_type": "Type of contract",
  "parties_involved": "Party A and Party B",
  "key_obligations": "Brief description of main obligations",
  "payment_terms": "Brief description of payment terms",
  "termination_conditions": "Brief description of termination conditions",
  "overall_risk": "Low | Medium | High"
}}
Do NOT include any markdown formatting. Return ONLY the raw JSON string."""

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": "You are a legal contract analysis assistant. Always return valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 500
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()

            # Parse JSON from response
            try:
                summary = json.loads(answer)
            except json.JSONDecodeError:
                # Try to extract JSON from the response
                json_match = answer[answer.find("{"):answer.rfind("}") + 1]
                summary = json.loads(json_match)

            return {"summary": summary}
    except Exception as e:
        logger.error(f"Summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate contract summary.")

# --- Voice Input Endpoint ---

SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text-translate"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

@app.post("/voice-query")
async def voice_query(file: UploadFile = File(...)):
    """
    Endpoint to receive audio from frontend and send to Sarvam API.
    """
    try:
        content = await file.read()
        
        files = {
            'file': (file.filename, content, file.content_type)
        }
        data = {
            'model': 'saaras:v3'
        }
        headers = {
            "api-subscription-key": SARVAM_API_KEY
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(SARVAM_API_URL, data=data, files=files, headers=headers)
            if response.status_code != 200:
                logger.error(f"Sarvam API error: {response.text}")
                response.raise_for_status()
                
            result = response.json()
            
            transcript = result.get("transcript", "")
            return {"text": transcript}
    except Exception as e:
        logger.error(f"Voice query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process voice query: {str(e)}")


# --- Legal Chatbot Endpoint ---

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str

@app.post("/chat", response_model=ChatResponse)
async def legal_chat(req: ChatRequest):
    """
    Legal chatbot endpoint. Answers questions about Indian legal terms,
    IPC sections, contract laws, and general legal concepts.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    system_prompt = """You are a knowledgeable Indian Legal Assistant AI.
Your job is to help users understand legal concepts in simple, clear language.

Guidelines:
- Explain Indian legal terms and concepts in plain English.
- When relevant, mention exact IPC (Indian Penal Code) sections, CPC, CrPC, or other applicable laws.
- Keep answers concise but thorough (3-6 sentences).
- If a user asks about contract law, explain the relevant provisions.
- Always note that your answers are for educational purposes only and not legal advice.
- Be friendly and approachable in tone."""

    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": req.question}
        ],
        "temperature": 0.5,
        "max_tokens": 800
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(GROQ_API_URL, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            answer = result["choices"][0]["message"]["content"].strip()
            return ChatResponse(answer=answer)
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get a response from the AI. Please try again.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
