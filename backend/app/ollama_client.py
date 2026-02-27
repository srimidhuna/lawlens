import httpx
import json
import logging
import asyncio

logger = logging.getLogger(__name__)

OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3:8b-instruct-q4_0"

async def call_ollama(clause_text: str, role: str, jurisdiction: str) -> dict:
    if not clause_text or len(clause_text.strip()) < 10:
        return {
            "clause_text": clause_text,
            "risk_level": "LOW",
            "reason": "Clause is too short or empty to analyze.",
            "simple_explanation": "Nothing significant to analyze here."
        }

    prompt = f"""
You are an expert legal AI assistant specializing in contract risk analysis.
Analyze the following single contract clause for a {role} governed by the laws of {jurisdiction}.

Classify the clause as exactly one of: LOW, MEDIUM, HIGH risk.
Provide a short professional explanation for the reason.
Provide a plain English explanation for a non-lawyer.

CLAUSE TEXT:
{clause_text}

Provide the output EXCLUSIVELY in valid JSON format matching this exact structure natively:
{{
  "clause_text": "A brief 5-10 word title or summary of the clause",
  "risk_level": "LOW | MEDIUM | HIGH",
  "reason": "Short professional explanation",
  "simple_explanation": "Plain English explanation"
}}
Do NOT include any markdown formatting like ```json or ```. Return ONLY the raw JSON string. Do not include commentary.
"""

    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json"
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"Sending clause to Ollama: {clause_text[:50]}...")
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(OLLAMA_API_URL, json=payload)
                response.raise_for_status()
                
                result = response.json()
                response_text = result.get("response", "").strip()
                
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                    
                response_text = response_text.strip()
                parsed_json = json.loads(response_text)
                
                if "clause_text" not in parsed_json or len(parsed_json["clause_text"]) < 5:
                    parsed_json["clause_text"] = clause_text[:100] + "..." if len(clause_text) > 100 else clause_text
                    
                return parsed_json
                
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.warning(f"Ollama connection error on attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in 1 second... ({attempt + 1}/{max_retries})")
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached. Using safe fallback JSON.")
        except json.JSONDecodeError as e:
            logger.error(f"JSON Parse Error from Ollama on attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in 1 second... ({attempt + 1}/{max_retries})")
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached. Using safe fallback JSON.")
        except Exception as e:
            logger.error(f"Unexpected error during AI analysis on attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in 1 second... ({attempt + 1}/{max_retries})")
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached. Using safe fallback JSON.")

    return {
        "clause_text": clause_text[:100] + "..." if len(clause_text) > 100 else clause_text,
        "risk_level": "LOW",
        "reason": "AI service temporarily unavailable.",
        "simple_explanation": "Clause could not be analyzed automatically."
    }

