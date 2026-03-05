import httpx
import json
import logging
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.1-8b-instant"

async def call_ollama(clause_text: str, role: str, jurisdiction: str) -> dict:
    """Analyze a contract clause using the Groq API (LLaMA 3.1 8B Instant)."""
    if not clause_text or len(clause_text.strip()) < 10:
        return {
            "clause_text": clause_text,
            "risk_level": "LOW",
            "risk_score": 1,
            "reason": "Clause is too short or empty to analyze.",
            "simple_explanation": "Nothing significant to analyze here."
        }

    prompt = f"""You are an expert legal AI assistant specializing in contract risk analysis.
Analyze the following single contract clause for a {role} governed by the laws of {jurisdiction}.

Classify the clause as exactly one of: LOW, MEDIUM, HIGH risk.
Assign a risk_score from 1 to 10 (1 = safest, 10 = most dangerous).
Provide a short professional explanation for the reason.
Provide a plain English explanation for a non-lawyer.
Provide a detailed_explanation: a thorough 3-5 sentence explanation covering what this clause means, its legal implications for the {role}, potential risks or benefits, and any recommendations.

CLAUSE TEXT:
{clause_text}

Provide the output EXCLUSIVELY in valid JSON format matching this exact structure:
{{
  "clause_text": "A brief 5-10 word title or summary of the clause",
  "risk_level": "LOW | MEDIUM | HIGH",
  "risk_score": 5,
  "reason": "Short professional explanation",
  "simple_explanation": "Plain English explanation",
  "detailed_explanation": "A thorough 3-5 sentence explanation covering what this clause means, its legal implications, potential risks or benefits, and recommendations."
}}
Do NOT include any markdown formatting like ```json or ```. Return ONLY the raw JSON string. Do not include commentary."""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a legal contract risk analysis AI. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 500,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"Sending clause to Groq API: {clause_text[:50]}...")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(GROQ_API_URL, json=payload, headers=headers)
                response.raise_for_status()
                
                result = response.json()
                response_text = result["choices"][0]["message"]["content"].strip()
                
                # Clean up any markdown formatting
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
            logger.warning(f"Groq API connection error on attempt {attempt + 1}: {e}")
            if attempt < max_retries:
                logger.info(f"Retrying in 1 second... ({attempt + 1}/{max_retries})")
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached. Using safe fallback JSON.")
        except json.JSONDecodeError as e:
            logger.error(f"JSON Parse Error from Groq on attempt {attempt + 1}: {e}")
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
        "risk_score": 1,
        "reason": "AI service temporarily unavailable.",
        "simple_explanation": "Clause could not be analyzed automatically."
    }
