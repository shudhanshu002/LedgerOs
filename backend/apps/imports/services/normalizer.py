import hashlib
import json
from datetime import datetime


NAME_ALIASES = {
    "aisha": "Aisha",
    "rohan": "Rohan",
    "priya": "Priya",
    "priya s": "Priya",
    "meera": "Meera",
    "dev": "Dev",
    "sam": "Sam",
}


SUPPORTED_DATE_FORMATS = [
    "%Y-%m-%d",      # 2026-02-01
    "%d-%m-%Y",      # 01-03-2026
    "%d/%m/%Y",      # 01/03/2026
    "%m/%d/%Y",      # 03/01/2026
    "%d %b %Y",      # 14 Mar 2026
    "%d %B %Y",      # 14 March 2026
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

    text = str(value).strip()

    if text.lower() in ["nan", "none", "null"]:
        return ""

    return " ".join(text.split())


def normalize_person_name(value) -> str:
    """
    Normalizes person names from CSV.

    Examples:
    " priya " -> "Priya"
    "Priya S" -> "Priya"
    "rohan"   -> "Rohan"

    Unknown names are preserved so anomaly detector can flag them.
    Example:
    "Dev's friend Kabir" remains "Dev's friend Kabir"
    """

    cleaned = clean_text(value)

    if not cleaned:
        return ""

    key = cleaned.lower()

    return NAME_ALIASES.get(key, cleaned)


def normalize_people_list(value) -> list[str]:
    """
    Normalizes participant list.

    Real CSV uses split_with:

    Aisha;Rohan;Priya;Meera

    Supported separators:
    - semicolon
    - comma
    - pipe

    Returns:
    ["Aisha", "Rohan", "Priya", "Meera"]
    """

    if not value:
        return []

    raw = (
        str(value)
        .replace("|", ";")
        .replace(",", ";")
    )

    people = []

    for item in raw.split(";"):
        name = normalize_person_name(item)

        if name:
            people.append(name)

    return people


def parse_date_or_none(value):
    """
    Tries to parse a date.

    Returns:
    - date object if valid
    - None if invalid or ambiguous

    Important:
    The real CSV has a row like "Mar 14".
    We intentionally do not guess the year.
    That row should become an INVALID_DATE anomaly.
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

    Real CSV has some blank currency values.

    Policy:
    Blank currency becomes empty string, not INR.
    Then anomaly detector can decide whether to block or default.
    """

    cleaned = clean_text(value).upper()

    if cleaned in ["RUPEE", "RUPEES", "INR", "₹", "RS", "RS."]:
        return "INR"

    if cleaned in ["USD", "US DOLLAR", "US DOLLARS", "$", "DOLLAR", "DOLLARS"]:
        return "USD"

    return cleaned


def normalize_split_type(value) -> str:
    """
    Normalizes split type from CSV.

    Real CSV has:
    - equal
    - unequal
    - percentage
    - share
    - blank for settlement row

    Supported output:
    EQUAL
    EXACT
    PERCENTAGE
    SHARE
    """

    cleaned = clean_text(value).upper()

    aliases = {
        "": "",
        "EQUAL": "EQUAL",
        "EQUALLY": "EQUAL",
        "EQUAL_SPLIT": "EQUAL",

        "UNEQUAL": "EXACT",
        "EXACT": "EXACT",
        "EXACT_AMOUNT": "EXACT",
        "EXACTS": "EXACT",

        "PERCENT": "PERCENTAGE",
        "PERCENTAGE": "PERCENTAGE",
        "PERCENTAGE_SPLIT": "PERCENTAGE",

        "SHARE": "SHARE",
        "SHARES": "SHARE",
        "BY_SHARE": "SHARE",
    }

    return aliases.get(cleaned, cleaned)


def get_first_available(raw: dict, possible_keys: list[str]):
    """
    CSV headers may vary slightly.

    Real CSV uses:
    - split_with instead of participants
    - split_details instead of split_values

    This lets us support both without editing CSV manually.
    """

    for key in possible_keys:
        if key in raw:
            return raw.get(key)

    return ""


def normalize_raw_split_details(value) -> str:
    """
    Normalizes split details but does not fully parse them here.

    Real CSV examples:
    Rohan 700; Priya 400; Meera 400
    Aisha 30%; Rohan 30%; Priya 30%; Meera 20%
    Aisha 1; Rohan 2; Priya 1; Dev 2

    Full parsing happens in split_calculator.py.
    """

    return clean_text(value)


def normalize_row(raw: dict) -> dict:
    """
    Converts one raw CSV row into normalized format.

    Important:
    This does not decide whether row is valid.
    It only cleans and standardizes values.

    Validation/anomaly detection happens in anomaly_detector.py.
    """

    date_raw = clean_text(
        get_first_available(
            raw,
            ["date", "Date", "expense_date", "Expense Date"],
        )
    )

    parsed_date = parse_date_or_none(date_raw)

    split_with_raw = get_first_available(
        raw,
        [
            "split_with",
            "Split With",
            "participants",
            "Participants",
            "members",
            "Members",
        ],
    )

    split_details_raw = get_first_available(
        raw,
        [
            "split_details",
            "Split Details",
            "split_values",
            "Split Values",
            "shares",
            "Shares",
        ],
    )

    normalized = {
        "date_raw": date_raw,
        "date": parsed_date.isoformat() if parsed_date else None,

        "description": clean_text(
            get_first_available(
                raw,
                ["description", "Description", "title", "Title"],
            )
        ),

        "category": clean_text(
            get_first_available(raw, ["category", "Category"])
        ),

        "payer": normalize_person_name(
            get_first_available(
                raw,
                ["paid_by", "payer", "Paid By", "Payer"],
            )
        ),

        "amount_raw": clean_text(
            get_first_available(raw, ["amount", "Amount"])
        ),

        "currency": normalize_currency(
            get_first_available(raw, ["currency", "Currency"])
        ),

        "split_type": normalize_split_type(
            get_first_available(
                raw,
                ["split_type", "Split Type", "split", "Split"],
            )
        ),

        "participants": normalize_people_list(split_with_raw),

        "split_values_raw": normalize_raw_split_details(split_details_raw),

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

    " priya " and "Priya"
    "inr" and "INR"
    """

    payload = json.dumps(
        normalized,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()