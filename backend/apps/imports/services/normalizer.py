import hashlib
import json
from datetime import datetime


NAME_ALIASES = {
    "aisha": "Aisha",
    "rohan": "Rohan",
    "priya": "Priya",
    "meera": "Meera",
    "dev": "Dev",
    "sam": "Sam",
}


SUPPORTED_DATE_FORMATS = [
    "%Y-%m-%d",      # 2024-03-12
    "%d-%m-%Y",      # 12-03-2024
    "%d/%m/%Y",      # 12/03/2024
    "%m/%d/%Y",      # 03/12/2024
    "%d %b %Y",      # 12 Mar 2024
    "%d %B %Y",      # 12 March 2024
]


def clean_text(value) -> str:
    """
    Converts any value into clean text.

    Examples:
    "  Priya   Singh " -> "Priya Singh"
    None              -> ""
    """

    if value is None:
        return ""

    return " ".join(str(value).strip().split())


def normalize_person_name(value) -> str:
    """
    Normalizes person names from CSV.

    Examples:
    " priya " -> "Priya"
    "ROHAN"   -> "Rohan"

    Unknown names are preserved so anomaly detector can flag them.
    Example:
    "Kabir" remains "Kabir"
    """

    cleaned = clean_text(value)

    if not cleaned:
        return ""

    key = cleaned.lower()

    return NAME_ALIASES.get(key, cleaned)


def normalize_people_list(value) -> list[str]:
    """
    Normalizes participant list.

    Supported CSV styles:
    Aisha,Rohan,Priya
    Aisha; Rohan; Priya
    Aisha | Rohan | Priya

    Returns:
    ["Aisha", "Rohan", "Priya"]
    """

    if not value:
        return []

    raw = (
        str(value)
        .replace("|", ",")
        .replace(";", ",")
    )

    people = []

    for item in raw.split(","):
        name = normalize_person_name(item)

        if name:
            people.append(name)

    return people


def parse_date_or_none(value):
    """
    Tries to parse a date.

    Returns:
    - date object if valid
    - None if invalid

    We do not guess silently.
    If parsing fails, anomaly detector will create INVALID_DATE issue.
    """

    text = clean_text(value)

    if not text:
        return None

    for date_format in SUPPORTED_DATE_FORMATS:
        try:
            return datetime.strptime(text, date_format).date()
        except ValueError:
            continue

    return None


def normalize_currency(value) -> str:
    """
    Normalizes currency values.

    Examples:
    "inr" -> "INR"
    "usd" -> "USD"
    "$"   -> "USD"
    "₹"   -> "INR"
    """

    cleaned = clean_text(value).upper()

    if cleaned in ["", "RUPEE", "RUPEES", "INR", "₹", "RS", "RS."]:
        return "INR"

    if cleaned in ["USD", "US DOLLAR", "US DOLLARS", "$", "DOLLAR", "DOLLARS"]:
        return "USD"

    return cleaned


def normalize_split_type(value) -> str:
    """
    Normalizes split type from CSV.

    Supported output:
    EQUAL
    EXACT
    PERCENTAGE
    SHARE
    """

    cleaned = clean_text(value).upper()

    aliases = {
        "": "EQUAL",
        "EQUALLY": "EQUAL",
        "EQUAL_SPLIT": "EQUAL",
        "EXACT_AMOUNT": "EXACT",
        "EXACTS": "EXACT",
        "PERCENT": "PERCENTAGE",
        "PERCENTAGE_SPLIT": "PERCENTAGE",
        "SHARES": "SHARE",
        "BY_SHARE": "SHARE",
    }

    return aliases.get(cleaned, cleaned)


def get_first_available(raw: dict, possible_keys: list[str]):
    """
    CSV headers may vary slightly.

    This lets us support:
    - paid_by
    - payer
    - Paid By

    without editing the CSV manually.
    """

    for key in possible_keys:
        if key in raw:
            return raw.get(key)

    return ""


def normalize_row(raw: dict) -> dict:
    """
    Converts one raw CSV row into normalized format.

    Important:
    This does not decide whether row is valid.
    It only cleans and standardizes values.

    Validation/anomaly detection happens in anomaly_detector.py.
    """

    date_raw = clean_text(
        get_first_available(raw, ["date", "Date", "expense_date", "Expense Date"])
    )

    parsed_date = parse_date_or_none(date_raw)

    normalized = {
        "date_raw": date_raw,
        "date": parsed_date.isoformat() if parsed_date else None,

        "description": clean_text(
            get_first_available(raw, ["description", "Description", "title", "Title"])
        ),

        "category": clean_text(
            get_first_available(raw, ["category", "Category"])
        ),

        "payer": normalize_person_name(
            get_first_available(raw, ["paid_by", "payer", "Paid By", "Payer"])
        ),

        "amount_raw": clean_text(
            get_first_available(raw, ["amount", "Amount"])
        ),

        "currency": normalize_currency(
            get_first_available(raw, ["currency", "Currency"])
        ),

        "split_type": normalize_split_type(
            get_first_available(raw, ["split_type", "Split Type", "split", "Split"])
        ),

        "participants": normalize_people_list(
            get_first_available(raw, ["participants", "Participants", "members", "Members"])
        ),

        "split_values_raw": clean_text(
            get_first_available(raw, ["split_values", "Split Values", "shares", "Shares"])
        ),

        "notes": clean_text(
            get_first_available(raw, ["notes", "Notes", "note", "Note"])
        ),
    }

    return normalized


def normalized_row_hash(normalized: dict) -> str:
    """
    Creates stable hash for exact duplicate detection.

    We hash normalized data, not raw data.

    Reason:
    These should be treated as duplicate-like:

    " Priya " and "priya"
    "inr" and "INR"
    """

    payload = json.dumps(
        normalized,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()