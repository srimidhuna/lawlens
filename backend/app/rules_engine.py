import re
import logging

logger = logging.getLogger(__name__)

import re
import logging

logger = logging.getLogger(__name__)

def evaluate_clause_with_rules(clause_text: str) -> dict | None:
    """
    Evaluates a single clause against deterministic rules.
    If a rule matches, returns the clause dict.
    Otherwise, returns None.
    """
    text = clause_text.lower()
    short_text = clause_text[:100].strip() + "..." if len(clause_text) > 100 else clause_text.strip()
    
    # Rule 1: "without notice"
    if "without notice" in text:
        return _build_clause_result(short_text, "HIGH", "Contains phrase 'without notice' which poses high termination/action risk.", "The other party can take action against you without any advance warning.", "Contains 'without notice'")

    # Rule 2: "terminate immediately"
    if "terminate immediately" in text:
        return _build_clause_result(short_text, "HIGH", "Allows for immediate termination, highly risky.", "The contract can be canceled right away without giving you time to prepare.", "Contains 'terminate immediately'")
        
    # Rule 3: "waives the right"
    if "waives the right" in text:
        return _build_clause_result(short_text, "HIGH", "Requires waiving important legal rights.", "You are agreeing to give up some of your legal rights.", "Contains 'waives the right'")

    # Rule 4: Excessive Deposit
    deposit_val = _check_deposit(text)
    if "5 months" in text or deposit_val > 2:
        val_str = str(deposit_val) if deposit_val > 2 else "5"
        return _build_clause_result(short_text, "HIGH", f"Requires deposit of {val_str} months, exceeding standard 2 months.", f"You are asked to pay an unusually high security deposit ({val_str} months).", f"Deposit > 2 months ({val_str} months)")

    # Rule 5: Non-compete > 2 years
    nc_val = _check_non_compete(text)
    if nc_val > 2:
        return _build_clause_result(short_text, "HIGH", f"Non-compete clause lasting {nc_val} years is highly restrictive.", f"You won't be able to work for competitors for {nc_val} years after leaving.", f"Non-compete > 2 years ({nc_val} years)")

    # Rule 6: Structural repairs (tenant)
    if "structural repairs" in text and "tenant" in text:
        return _build_clause_result(short_text, "MEDIUM", "Assigns structural repairs to tenant.", "You might be responsible for major building repairs, which usually the landlord handles.", "Tenant responsible for structural repairs")

    # Rule 7: Arbitration controlled by one party
    if "arbitration" in text and any(x in text for x in ["sole", "exclusive", "unilateral"]):
        return _build_clause_result(short_text, "MEDIUM", "Arbitration appears to be one-sided.", "If there's a dispute, the other party has too much control over how it's resolved.", "One-sided arbitration")

    return None

def _build_clause_result(text: str, level: str, reason: str, simple: str, rule: str) -> dict:
    return {
        "clause_text": text,
        "risk_level": level,
        "reason": reason,
        "simple_explanation": simple,
        "rule_override": f"Rule applied: {rule}"
    }

def calculate_overall_risk(clauses: list[dict]) -> str:
    has_high = any(c.get("risk_level", "").upper() == "HIGH" for c in clauses if isinstance(c, dict))
    has_medium = any(c.get("risk_level", "").upper() == "MEDIUM" for c in clauses if isinstance(c, dict))
    if has_high:
        return "HIGH"
    elif has_medium:
        return "MEDIUM"
    elif clauses:
        return "LOW"
    return "UNKNOWN"

def _parse_number(val_str: str) -> int:
    val_str = val_str.lower().strip()
    word_to_num = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 
        'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12
    }
    if val_str.isdigit():
        return int(val_str)
    return word_to_num.get(val_str, 0)

def _check_deposit(text: str) -> int:
    max_months = 0
    patterns = [
        r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:-|)\s*months?\s+(?:security\s+)?(?:damage\s+)?deposit',
        r'deposit\s+(?:of\s+)?(?:up\s+to\s+)?(?:an\s+amount\s+(?:equal\s+to\s+)?)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(?:-|)\s*months?'
    ]
    for p in patterns:
        for match in re.finditer(p, text):
            val = _parse_number(match.group(1))
            if val > max_months:
                max_months = val
    return max_months

def _check_non_compete(text: str) -> int:
    max_years = 0
    patterns = [
        r'(?:non-compete|noncompete|non\s+compete).{0,40}?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-|)\s*years?',
        r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:-|)\s*years?.{0,40}?(?:non-compete|noncompete|non\s+compete)'
    ]
    for p in patterns:
        for match in re.finditer(p, text):
            val = _parse_number(match.group(1))
            if val > max_years:
                max_years = val
    return max_years
