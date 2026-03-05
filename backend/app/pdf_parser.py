import pdfplumber
import io
import re

async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file using pdfplumber.
    Preserves paragraph/clause structure with double newlines.
    """
    if not file_bytes:
        return ""
        
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            if len(pdf.pages) == 0:
                return ""
                
            full_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text.append(text)
                    
            # Join all pages with double newline
            extracted_string = "\n\n".join(full_text)
            
            # Normalize: collapse multiple spaces/tabs
            text_cleaned = re.sub(r'[ \t]+', ' ', extracted_string).strip()
            
            return text_cleaned
            
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""

def split_into_clauses(text: str) -> list[str]:
    """
    Splits the contract text into individual clauses.
    Uses a multi-strategy approach to detect clause boundaries accurately.
    """
    print(f"DEBUG: Starting clause splitting. Text length: {len(text)}")
    
    # Strategy 1: Top-level numbered clauses (e.g., "1.", "2.", "10.")
    # Match numbers at line start (after any newline or start of text)
    numbered_pattern = r'(?:^|\n)\s*(\d{1,3})\.\s+'
    numbered_matches = list(re.finditer(numbered_pattern, text))
    
    if numbered_matches:
        # Filter to only top-level: keep only sequential or near-sequential numbers
        top_level_matches = _filter_top_level_numbers(numbered_matches)
        
        if len(top_level_matches) >= 3:
            clauses = _extract_chunks(text, top_level_matches)
            print(f"DEBUG: Detected {len(clauses)} clauses (numbered pattern).")
            return clauses
    
    # Strategy 2: Keyword headers (Clause/Section/Article + number)
    keyword_pattern = r'(?i)(?:^|\n)\s*(?:clause|section|article)\s+\d+'
    keyword_matches = list(re.finditer(keyword_pattern, text))
    
    if len(keyword_matches) >= 3:
        clauses = _extract_chunks(text, keyword_matches)
        print(f"DEBUG: Detected {len(clauses)} clauses (keyword pattern).")
        return clauses
    
    # Strategy 3: Fallback — split by double newlines (paragraph breaks)
    parts = re.split(r'\n\s*\n', text)
    clauses = [p.strip() for p in parts if p and len(p.strip()) > 50]
    
    # Merge short consecutive chunks that likely belong together
    clauses = _merge_short_chunks(clauses, min_length=100)
    
    print(f"DEBUG: Detected {len(clauses)} clauses (paragraph fallback).")
    return clauses


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
