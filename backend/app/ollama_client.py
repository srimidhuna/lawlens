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

    # --- Role-specific prompts ---
    if role.lower() == "land_owner":
        system_content = (
            "You are an expert legal AI assistant specializing in property law, "
            "land registration documents, and real estate transactions. You have "
            "deep knowledge of land registration acts, title deeds, sale deeds, "
            "mortgage documents, lease deeds, and property transfer laws across "
            "multiple jurisdictions."
        )

        prompt = f"""Analyze the following clause from a land registration document for a \
property buyer/owner governed by the laws of {jurisdiction}.

This is a property/land registration document. Common risk factors include:
- Encumbrances, liens, or mortgages on the property
- Unclear or disputed title ownership
- Easement rights that restrict property use
- Restrictive covenants limiting what you can build or do
- Right of re-entry clauses by the seller or government
- Unclear boundary descriptions
- Stamp duty and registration fee discrepancies
- Power of attorney misuse
- Undisclosed legal heirs or co-owners
- Government acquisition or reservation clauses
- Mutation and khata transfer conditions
- Pending litigation or court orders on the property

Classify the clause as exactly one of: LOW, MEDIUM, HIGH risk.

LOW risk means: Standard boilerplate, clear title, no restrictions, \
normal registration formalities.

MEDIUM risk means: Some conditions apply, minor encumbrances, \
restrictions on use, requires follow-up verification.

HIGH risk means: Title disputes, undisclosed liabilities, government \
acquisition risk, power of attorney abuse, encumbrances that could \
cause loss of property.

Assign a risk_score from 1 to 10 where:
1-3 = Standard registration clause, nothing concerning
4-6 = Some conditions that need attention
7-10 = Serious risk that could cause financial or legal loss

CLAUSE TEXT:
{clause_text}

Provide output EXCLUSIVELY in valid JSON:
{{
  "clause_text": "Brief 5-10 word title of the clause",
  "risk_level": "LOW | MEDIUM | HIGH",
  "risk_score": 5,
  "reason": "Short professional legal explanation of why this is risky",
  "simple_explanation": "Plain English explanation for a property buyer with no legal background",
  "detailed_explanation": "3-5 sentences covering what this clause means for the property buyer, its legal implications under {jurisdiction} property law, what could go wrong, and what the buyer should verify or do about it."
}}
Do NOT include markdown formatting. Return ONLY raw JSON."""

    else:
        system_content = "You are a legal contract risk analysis AI. Always respond with valid JSON only."

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
            {"role": "system", "content": system_content},
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


async def generate_safer_clause(clause_text: str) -> dict | None:
    """Generate a safer rewrite for a high-risk contract clause using the Groq API."""
    prompt = f"""You are a legal contract assistant.

The following contract clause has been identified as high risk.
Explain briefly why it is risky, and rewrite the clause to make it fair and legally safer for both parties.

Return the response in this format:

{{
  "risk_reason": "short explanation (1-2 sentences)",
  "safer_clause": "rewritten safer clause"
}}

Clause:
{clause_text}"""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a legal contract assistant. Always respond with valid JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 600,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    max_retries = 2
    for attempt in range(max_retries + 1):
        try:
            logger.debug(f"Generating safer clause for: {clause_text[:50]}...")
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
                parsed = json.loads(response_text)

                if "safer_clause" in parsed:
                    return parsed
                else:
                    logger.warning("Safer clause response missing 'safer_clause' key.")
                    return None

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.warning(f"Groq API error during safer clause generation (attempt {attempt + 1}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached for safer clause generation.")
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for safer clause (attempt {attempt + 1}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached for safer clause generation.")
        except Exception as e:
            logger.error(f"Unexpected error during safer clause generation (attempt {attempt + 1}): {e}")
            if attempt < max_retries:
                await asyncio.sleep(1)
            else:
                logger.error("Max retries reached for safer clause generation.")

    return None
