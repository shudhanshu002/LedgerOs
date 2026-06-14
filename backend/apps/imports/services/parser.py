import csv
import io

from django.db import transaction

from apps.imports.models import ImportBatch, ImportRow
from apps.imports.services.anomaly_detector import (
    detect_batch_anomalies,
    detect_row_anomalies,
    refresh_batch_summary,
    update_row_status_from_issues,
)
from apps.imports.services.normalizer import normalize_row, normalized_row_hash


class ImportParserError(ValueError):
    pass


REQUIRED_HEADERS = {
    "date",
    "description",
    "paid_by",
    "amount",
    "currency",
    "split_type",
    "participants",
}


def normalize_header(header: str) -> str:
    """
    Normalizes CSV headers.

    Examples:
    "Paid By"    -> "paid_by"
    "Split Type" -> "split_type"
    """

    return (
        str(header)
        .strip()
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def normalize_raw_row_keys(raw_row: dict) -> dict:
    """
    Converts raw CSV headers into normalized keys.

    Example:
    {
      "Paid By": "Aisha"
    }

    becomes:

    {
      "paid_by": "Aisha"
    }
    """

    normalized = {}

    for key, value in raw_row.items():
        normalized[normalize_header(key)] = value

    return normalized


def validate_headers(fieldnames: list[str]):
    """
    Checks whether the uploaded CSV has enough columns to parse.

    Important:
    We do not require exact official CSV headers yet because the official file
    is not downloadable right now.

    But we still require core meaning columns.
    """

    if not fieldnames:
        raise ImportParserError("CSV has no header row.")

    normalized_headers = {
        normalize_header(header)
        for header in fieldnames
    }

    missing_headers = REQUIRED_HEADERS - normalized_headers

    if missing_headers:
        raise ImportParserError(
            f"CSV is missing required headers: {', '.join(sorted(missing_headers))}"
        )


def read_uploaded_csv(file_obj) -> tuple[list[str], list[dict]]:
    """
    Reads uploaded CSV file safely.

    Returns:
    - headers
    - rows as dictionaries

    This function does not create DB records.
    """

    try:
        raw_content = file_obj.read()
    except Exception as exc:
        raise ImportParserError("Could not read uploaded file.") from exc

    try:
        decoded = raw_content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ImportParserError("CSV must be UTF-8 encoded.") from exc

    reader = csv.DictReader(io.StringIO(decoded))

    validate_headers(reader.fieldnames)

    rows = []

    for raw_row in reader:
        rows.append(normalize_raw_row_keys(raw_row))

    return reader.fieldnames, rows


@transaction.atomic
def create_import_batch_from_csv(
    *,
    group,
    uploaded_by,
    file_obj,
) -> ImportBatch:
    """
    Main CSV import entry point.

    Flow:
    1. Read uploaded CSV
    2. Create ImportBatch
    3. Create ImportRow for every row
    4. Normalize row
    5. Detect row-level anomalies
    6. Detect batch-level anomalies
    7. Refresh statuses and summary

    Important:
    This does NOT create Expense rows yet.
    Actual expense creation happens later in commit_import.py after review.
    """

    _, rows = read_uploaded_csv(file_obj)

    batch = ImportBatch.objects.create(
        group=group,
        uploaded_by=uploaded_by,
        original_filename=getattr(file_obj, "name", "uploaded.csv"),
        total_rows=len(rows),
    )

    created_rows = []

    for index, raw_row in enumerate(rows, start=2):
        normalized = normalize_row(raw_row)

        import_row = ImportRow.objects.create(
            batch=batch,
            row_number=index,
            raw_data=raw_row,
            normalized_data=normalized,
            row_hash=normalized_row_hash(normalized),
        )

        detect_row_anomalies(
            batch=batch,
            row=import_row,
            group=group,
        )

        update_row_status_from_issues(import_row)

        created_rows.append(import_row)

    detect_batch_anomalies(batch)

    for import_row in created_rows:
        update_row_status_from_issues(import_row)

    refresh_batch_summary(batch)

    return batch