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
    Trim a CSV value and collapse repeated whitespace.
    """

    if value is None:
        return ""

    text = str(value).strip()

    if text.lower() in ["nan", "none", "null"]:
        return ""

    return " ".join(text.split())


def normalize_person_name(value) -> str:
    """
    Map known name variants to canonical usernames.

    Unknown names are preserved so the anomaly detector can flag them.
    """

    cleaned = clean_text(value)

    if not cleaned:
        return ""

    key = cleaned.lower()

    return NAME_ALIASES.get(key, cleaned)


def normalize_people_list(value) -> list[str]:
    """
    Split and normalize a participant list from the CSV.
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
    Parse supported date formats.

    Dates without a year are left unresolved so review can catch them.
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
    Normalize supported currency labels.

    Blank values stay blank so validation can block them explicitly.
    """

    cleaned = clean_text(value).upper()

    if cleaned in ["RUPEE", "RUPEES", "INR", "₹", "RS", "RS."]:
        return "INR"

    if cleaned in ["USD", "US DOLLAR", "US DOLLARS", "$", "DOLLAR", "DOLLARS"]:
        return "USD"

    return cleaned


def normalize_split_type(value) -> str:
    """
    Normalize CSV split labels to the backend enum values.
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
    Return the first matching value from a list of accepted header names.
    """

    for key in possible_keys:
        if key in raw:
            return raw.get(key)

    return ""


def normalize_raw_split_details(value) -> str:
    """
    Clean split details; detailed parsing happens in split_calculator.py.
    """

    return clean_text(value)


def normalize_row(raw: dict) -> dict:
    """
    Convert one raw CSV row into the normalized import shape.

    This only cleans values. Validation happens in anomaly_detector.py.
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
    Build a stable hash from normalized data for duplicate detection.
    """

    payload = json.dumps(
        normalized,
        sort_keys=True,
        separators=(",", ":"),
    )

    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
