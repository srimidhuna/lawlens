import pdfplumber
import io
import re
import logging
import base64
import os
from io import BytesIO

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException

import platform
import glob

load_dotenv()

logger = logging.getLogger(__name__)


def _get_poppler_path() -> str | None:
    """
    Auto-detect Poppler binary path on Windows.
    Checks common install locations. Returns None on non-Windows (uses system PATH).
    """
    if platform.system() != "Windows":
        return None

    search_paths = [
        r"C:\poppler\*\Library\bin",
        r"C:\Program Files\poppler*\bin",
        r"C:\Program Files (x86)\poppler*\bin",
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "poppler*", "Library", "bin"),
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "poppler*", "bin"),
    ]
    for pattern in search_paths:
        matches = glob.glob(pattern)
        if matches:
            logger.info(f"Found Poppler at: {matches[0]}")
            return matches[0]

    return None


POPPLER_PATH = _get_poppler_path()


def clean_llm_ocr_output(raw_text: str) -> str:
    """
    Cleans raw text output from Llama 4 Scout Vision to remove
    common LLM preamble patterns, normalize line endings, and
    collapse excessive blank lines.
    """
    # Step 1: Strip leading and trailing whitespace
    text = raw_text.strip()

    # Step 2: Remove common LLM preamble patterns from the start
    preamble_patterns = [
        "here is the extracted text",
        "here is the text",
        "the document contains",
        "the document states",
        "i can see",
        "the following text",
        "extracted text:",
        "text from the document",
        "below is the text",
    ]
    text_lower = text.lower()
    for pattern in preamble_patterns:
        if text_lower.startswith(pattern):
            # Remove everything up to and including the first newline after the preamble
            newline_idx = text.find("\n")
            if newline_idx != -1:
                text = text[newline_idx + 1:]
            else:
                # If no newline, remove the preamble itself
                text = text[len(pattern):]
            break

    # Step 3: Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Step 4: Collapse more than 3 consecutive newlines down to 2
    text = re.sub(r"\n{4,}", "\n\n", text)

    # Step 5: Strip again after all cleaning
    text = text.strip()

    return text


def restore_document_structure(text: str) -> str:
    """
    Restores document structure by inserting newlines before known legal
    section headers that Llama 4 Scout may have merged into flowing text.
    This ensures split_into_clauses() can correctly identify clause boundaries.
    """
    # Step 1: Known land registration headers and legal section names
    headers = [
        "SALE DEED", "Parties Involved", "Seller", "Buyer",
        "Property Description", "Boundaries", "Consideration",
        "Payment Terms", "Ownership Declaration", "Special Conditions",
        "Additional Clauses", "Possession Clause", "Indemnity Clause",
        "Signatures", "Schedule", "Recitals", "Whereas", "Witnesseth",
        "Terms and Conditions", "Encumbrances", "Title Clause",
        "Transfer Clause", "Registration Details", "Stamp Duty",
        "Declaration", "Covenants", "Representations", "Warranties",
        "Governing Law", "Dispute Resolution", "Force Majeure",
        "Power of Attorney", "AND WHEREAS", "NOW THIS DEED",
        "IN WITNESS WHEREOF",
    ]

    # Step 2: Insert newlines before headers found in flowing text
    for header in headers:
        escaped = re.escape(header)

        # Pattern A: header after sentence-ending punctuation
        text = re.sub(
            r'(?<!\n)(?<=[.!?])\s+(' + escaped + r')\s*',
            r'\n\1\n',
            text,
            flags=re.IGNORECASE,
        )

        # Pattern B: header after multiple spaces (logical block boundary)
        text = re.sub(
            r'(?<!\n)\s{2,}(' + escaped + r':?\s*\n?)',
            r'\n\1',
            text,
            flags=re.IGNORECASE,
        )

    # Step 3: Normalize multiple consecutive newlines to maximum 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Step 4: Strip leading and trailing whitespace
    text = text.strip()

    # Step 5: Return the restructured text
    return text


async def extract_text_with_llama_vision(file_bytes: bytes) -> str:
    """
    Extracts text from a scanned/image-based PDF using Llama 4 Scout Vision
    via the Groq API. Converts each page to a JPEG image, encodes to base64,
    and sends to the vision model for OCR-like text extraction.
    """
    from pdf2image import convert_from_bytes

    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables")

    poppler_kwargs = {"poppler_path": POPPLER_PATH} if POPPLER_PATH else {}
    images = convert_from_bytes(file_bytes, dpi=200, fmt="jpeg", **poppler_kwargs)
    logger.info(f"Converted PDF to {len(images)} page image(s) for Llama Vision extraction.")

    page_texts = []

    async with httpx.AsyncClient(timeout=60.0) as client:
        for i, img in enumerate(images):
            buffer = BytesIO()
            img.save(buffer, format="JPEG")
            img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            payload = {
                "model": "meta-llama/llama-4-scout-17b-16e-instruct",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_base64}"
                                },
                            },
                            {
                                "type": "text",
                                "text": (
                                    "You are a text extraction tool. Your only job is to "
                                    "read this scanned legal document image and output the "
                                    "raw text exactly as it appears on the page.\n\n"
                                    "Rules you must follow without exception:\n"
                                    "- Output ONLY the text visible in the image\n"
                                    "- Do NOT write any introduction like 'Here is the text' "
                                    "or 'The document says' or any similar preamble\n"
                                    "- Do NOT summarize or paraphrase any part of the document\n"
                                    "- Do NOT skip any text even if it seems unimportant\n"
                                    "- Preserve all headings exactly as they appear\n"
                                    "- Preserve all paragraph breaks with a blank line between "
                                    "paragraphs\n"
                                    "- Preserve all legal phrases, clause names, and "
                                    "special terms word for word\n"
                                    "- If a word is unclear make your best effort to read it "
                                    "do not skip it\n"
                                    "- Start your output directly with the first word of the "
                                    "document with absolutely nothing before it\n\n"
                                    "CRITICAL FORMATTING RULES:\n"
                                    "- Every section heading or clause title must be on its "
                                    "own separate line with a newline before and after it\n"
                                    "- Never run a heading directly into paragraph text on "
                                    "the same line\n"
                                    "- Each paragraph must be separated from the next by "
                                    "a blank line\n"
                                    "- Example of correct format:\n"
                                    "  Special Conditions\n\n"
                                    "  The Seller is acting under Power of Attorney...\n\n"
                                    "  Additional Clauses\n\n"
                                    "  The property is subject to a civil dispute..."
                                ),
                            },
                        ],
                    }
                ],
                "temperature": 0.0,
                "max_tokens": 4096,
            }

            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            result = response.json()
            page_text = result["choices"][0]["message"]["content"]
            page_text = clean_llm_ocr_output(page_text)
            page_text = restore_document_structure(page_text)
            logger.info(f"Llama Vision page {i + 1}: extracted {len(page_text)} characters.")
            logger.info(f"Llama Vision page {i + 1} structure restored, preview: {page_text[:200]!r}")
            page_texts.append(page_text)

    joined_text = "\n\n".join(page_texts)

    # Validation: check for critical legal phrases
    legal_phrases = ["the", "and", "of", "shall", "party", "agreement", "clause", "section", "hereby"]
    joined_lower = joined_text.lower()
    found_count = sum(1 for phrase in legal_phrases if phrase in joined_lower)
    if found_count < 3:
        logger.warning(
            f"Llama Vision extracted text may be incomplete or corrupted: "
            f"only {found_count}/9 critical legal phrases found. "
            f"The quality may affect analysis accuracy."
        )

    return joined_text


async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file using a 3-tier pipeline:
      Tier 1 — pdfplumber (digital/text-based PDFs)
      Tier 2 — Llama 4 Scout Vision via Groq API (scanned PDFs)
      Tier 3 — pytesseract offline OCR fallback
    Preserves paragraph/clause structure with double newlines.
    """
    if not file_bytes:
        return ""

    extracted_text = ""

    # ── Tier 1: pdfplumber (works well for text-based PDFs) ──
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            if len(pdf.pages) > 0:
                full_text = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        full_text.append(text)
                extracted_text = "\n\n".join(full_text)
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")

    if len(extracted_text.strip()) >= 50:
        # Normalize: collapse multiple spaces/tabs
        text_cleaned = re.sub(r'[ \t]+', ' ', extracted_text).strip()
        return text_cleaned

    # ── Tier 2: Llama 4 Scout Vision via Groq API ──
    logger.info("pdfplumber returned insufficient text, trying Llama 4 Scout vision...")
    try:
        vision_text = await extract_text_with_llama_vision(file_bytes)
        if len(vision_text.strip()) >= 50:
            logger.info(
                f"Llama Vision extraction succeeded: {len(vision_text)} characters."
            )
            text_cleaned = re.sub(r'[ \t]+', ' ', vision_text).strip()
            return text_cleaned
        else:
            logger.warning(
                "Llama Vision returned insufficient text, falling back to pytesseract..."
            )
    except Exception as e:
        logger.warning(f"Llama Vision extraction failed: {e}. Falling back to pytesseract...")

    # ── Tier 3: pytesseract offline OCR fallback ──
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError:
        raise HTTPException(
            status_code=400,
            detail=(
                "The uploaded PDF appears to be a scanned image and could not be processed. "
                "The Groq API (Llama Vision) was also unavailable. To enable offline OCR, "
                "please install tesseract-ocr and pdf2image system dependencies: "
                "Ubuntu: sudo apt-get install tesseract-ocr poppler-utils | "
                "macOS: brew install tesseract poppler | "
                "Windows: install from UB-Mannheim/tesseract on GitHub and "
                "poppler from oschwartz10612/poppler-windows on GitHub. "
                "Then pip install pytesseract pdf2image Pillow."
            ),
        )

    try:
        poppler_kwargs = {"poppler_path": POPPLER_PATH} if POPPLER_PATH else {}
        images = convert_from_bytes(file_bytes, dpi=300, **poppler_kwargs)
        logger.info(f"pytesseract: converted PDF to {len(images)} page image(s).")
        page_texts = []
        for i, img in enumerate(images):
            page_text = pytesseract.image_to_string(img, config="--oem 3 --psm 6")
            logger.info(f"pytesseract page {i + 1}: {len(page_text)} characters.")
            page_texts.append(page_text)
        extracted_text = "\n\n".join(page_texts)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=(
                f"All three text extraction methods failed for this PDF. "
                f"Tier 1 (pdfplumber): insufficient text. "
                f"Tier 2 (Llama Vision): unavailable or failed. "
                f"Tier 3 (pytesseract): {e}"
            ),
        )

    if not extracted_text.strip():
        logger.error("No text could be extracted from the PDF after all 3 tiers.")
        return ""

    # Normalize: collapse multiple spaces/tabs
    text_cleaned = re.sub(r'[ \t]+', ' ', extracted_text).strip()

    return text_cleaned

def split_into_clauses(text: str) -> list[str]:
    """
    Splits the contract text into individual clauses.
    Uses a multi-strategy approach to detect clause boundaries accurately.
    """
    logger.info(f"DEBUG: Starting clause splitting. Text length: {len(text)}")
    
    if not text or len(text.strip()) < 20:
        logger.warning("Text too short to split into clauses.")
        return []
    
    # Strategy 1: Top-level numbered clauses (e.g., "1.", "2.", "10.")
    # Match numbers at line start (after any newline or start of text)
    numbered_pattern = r'(?:^|\n)\s*(\d{1,3})\.\s+'
    numbered_matches = list(re.finditer(numbered_pattern, text))
    
    if numbered_matches:
        # Filter to only top-level: keep only sequential or near-sequential numbers
        top_level_matches = _filter_top_level_numbers(numbered_matches)
        
        if len(top_level_matches) >= 3:
            clauses = _extract_chunks(text, top_level_matches)
            logger.info(f"DEBUG: Detected {len(clauses)} clauses (numbered pattern).")
            return clauses
    
    # Strategy 2: Keyword headers (Clause/Section/Article + number)
    keyword_pattern = r'(?i)(?:^|\n)\s*(?:clause|section|article|schedule|part)\s+\d+'
    keyword_matches = list(re.finditer(keyword_pattern, text))
    
    if len(keyword_matches) >= 3:
        clauses = _extract_chunks(text, keyword_matches)
        logger.info(f"DEBUG: Detected {len(clauses)} clauses (keyword pattern).")
        return clauses
    
    # Strategy 3: Land registration document segmentation
    is_land_doc = _is_land_registration_document(text)
    
    if is_land_doc:
        logger.info("DEBUG: Land registration document detected. Using land-specific splitting.")
        
        # 3a: Split by ALL CAPS headers (e.g. SCHEDULE OF PROPERTY, TERMS AND CONDITIONS)
        caps_header_pattern = r'\n([A-Z][A-Z\s]{4,})\n'
        caps_matches = list(re.finditer(caps_header_pattern, text))
        
        if len(caps_matches) >= 2:
            clauses = _extract_chunks(text, caps_matches)
            # Use lower minimum for land docs — boundary descriptions are short but important
            clauses = [c for c in clauses if len(c.strip()) > 30]
            if clauses:
                logger.info(f"DEBUG: Detected {len(clauses)} clauses (land doc — ALL CAPS headers).")
                return clauses
        
        # 3b: Split by legal transition phrases
        transition_pattern = r'(?=\b(?:WHEREAS|NOW THIS|IN WITNESS|SCHEDULE|AND WHEREAS|IT IS AGREED|PROVIDED THAT)\b)'
        transition_parts = re.split(transition_pattern, text)
        transition_clauses = [p.strip() for p in transition_parts if p and len(p.strip()) > 30]
        
        if len(transition_clauses) >= 2:
            logger.info(f"DEBUG: Detected {len(transition_clauses)} clauses (land doc — legal transition phrases).")
            return transition_clauses
        
        # 3c: Fall through to paragraph fallback with 30-char minimum for land docs
        parts = re.split(r'\n\s*\n', text)
        clauses = [p.strip() for p in parts if p and len(p.strip()) > 30]
        # Do NOT merge short chunks for land docs — short entries are independent legal statements
        if clauses:
            logger.info(f"DEBUG: Detected {len(clauses)} clauses (land doc — paragraph fallback).")
            return clauses
    
    # Strategy 4: Fallback — split by double newlines (paragraph breaks)
    parts = re.split(r'\n\s*\n', text)
    clauses = [p.strip() for p in parts if p and len(p.strip()) > 30]
    
    # Merge short consecutive chunks that likely belong together
    clauses = _merge_short_chunks(clauses, min_length=80)
    
    if clauses:
        logger.info(f"DEBUG: Detected {len(clauses)} clauses (paragraph fallback).")
        return clauses
    
    # Strategy 5: Split by single newlines (for documents without paragraph breaks)
    parts = text.split('\n')
    clauses = [p.strip() for p in parts if p and len(p.strip()) > 20]
    clauses = _merge_short_chunks(clauses, min_length=80)
    
    if clauses:
        logger.info(f"DEBUG: Detected {len(clauses)} clauses (single newline fallback).")
        return clauses
    
    # Strategy 6: Final fallback — treat entire text as chunks of ~500 characters at sentence boundaries
    if len(text.strip()) > 30:
        logger.info("DEBUG: Using sentence-chunking fallback.")
        sentences = re.split(r'(?<=[.!?])\s+', text)
        current_chunk = ""
        for s in sentences:
            if len(current_chunk) + len(s) > 500 and current_chunk:
                clauses.append(current_chunk.strip())
                current_chunk = s
            else:
                current_chunk += " " + s if current_chunk else s
        if current_chunk.strip():
            clauses.append(current_chunk.strip())
        logger.info(f"DEBUG: Created {len(clauses)} clauses (sentence chunking).")
        return clauses
    
    logger.warning("DEBUG: Could not split text into any clauses.")
    return clauses


def _is_land_registration_document(text: str) -> bool:
    """
    Detects if the document is a land registration document by checking
    for property/conveyance-related keywords.
    """
    text_lower = text.lower()
    land_keywords = [
        "deed", "vendor", "purchaser", "conveyance", "mortgagor",
        "mortgagee", "property", "consideration", "schedule",
        "encumbrance", "easement", "sale deed", "registration"
    ]
    match_count = sum(1 for kw in land_keywords if kw in text_lower)
    # Require at least 3 keyword matches to be confident it's a land document
    is_land = match_count >= 3
    if is_land:
        logger.info(f"DEBUG: Land registration keywords matched: {match_count}/{len(land_keywords)}")
    return is_land


def _filter_top_level_numbers(matches):
    """
    From a list of numbered pattern matches, filter out sub-clauses.
    Keeps only matches where numbers form a roughly sequential series (1, 2, 3...).
    """
    if not matches:
        return []
    
    # Extract (match, number) pairs
    pairs = []
    for m in matches:
        try:
            num = int(m.group(1))
            pairs.append((m, num))
        except (ValueError, IndexError):
            continue
    
    if not pairs:
        return []
    
    # Find the longest sequential-ish series starting from a low number
    best_series = []
    
    # Try starting from each match that has a low number (1 or 2)
    for start_idx, (match, num) in enumerate(pairs):
        if num > 2:
            continue
        
        series = [(match, num)]
        last_num = num
        
        for j in range(start_idx + 1, len(pairs)):
            next_match, next_num = pairs[j]
            # Accept if next number is within reasonable range (allows gaps)
            if last_num < next_num <= last_num + 3:
                series.append((next_match, next_num))
                last_num = next_num
        
        if len(series) > len(best_series):
            best_series = series
    
    return [m for m, _ in best_series]


def _extract_chunks(text, matches):
    """Extract text chunks between match positions."""
    clauses = []
    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        if len(chunk) > 30:
            clauses.append(chunk)
    return clauses


def _merge_short_chunks(clauses, min_length=100):
    """
    Merge short consecutive chunks that are likely fragments of the same clause.
    """
    if not clauses:
        return []
    
    merged = [clauses[0]]
    for i in range(1, len(clauses)):
        # If previous chunk is too short, merge with current
        if len(merged[-1]) < min_length:
            merged[-1] = merged[-1] + "\n\n" + clauses[i]
        else:
            merged.append(clauses[i])
    
    # Final pass: merge the last chunk if too short
    if len(merged) > 1 and len(merged[-1]) < min_length:
        merged[-2] = merged[-2] + "\n\n" + merged[-1]
        merged.pop()
    
    return merged
