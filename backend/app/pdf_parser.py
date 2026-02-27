import pdfplumber
import io
import re

async def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extracts text from a PDF file using pdfplumber.
    Safely handles empty PDFs and cleans up extra whitespace while preserving paragraph breaks.
    """
    if not file_bytes:
        return ""
        
    try:
        # Load the PDF from bytes in memory
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            if len(pdf.pages) == 0:
                return ""
                
            full_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text.append(text)
                    
            # Join all pages
            extracted_string = "\n\n".join(full_text)
            
            # Keep double newlines for paragraph breaks, replace single newlines with spaces
            text_cleaned = re.sub(r'\n(?!\n)', ' ', extracted_string)
            text_cleaned = re.sub(r'\n\n+', '\n\n', text_cleaned)
            text_cleaned = re.sub(r'[ \t]+', ' ', text_cleaned).strip()
            
            return text_cleaned
            
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return ""

def split_into_clauses(text: str) -> list[str]:
    """
    Splits the contract text into individual clauses based on common markers or sentence boundaries.
    """
    print(f"DEBUG: Starting clause splitting. Text length: {len(text)}")
    
    # Split by double newlines, Clause, Section, Article, or numbered list
    pattern = r'(?i)\n\n+|\b(?:clause|section|article)\s*\d*\b|(?<=\s)\d+\.\d*(?=\s)'
    parts = re.split(pattern, text)
    
    clauses = []
    for p in parts:
        if p and len(p.strip()) > 30:
            clauses.append(p.strip())
            
    # Fallback: if a chunk is still massive, split by sentences (period followed by space and capital letter)
    final_clauses = []
    for c in clauses:
        if len(c) > 1000:
            sub_parts = re.split(r'(?<=\.)\s+(?=[A-Z])', c)
            for sp in sub_parts:
                if len(sp.strip()) > 30:
                    final_clauses.append(sp.strip())
        else:
            final_clauses.append(c)
            
    print(f"DEBUG: Detected {len(final_clauses)} clauses.")
    return final_clauses
