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
    "split_with",
    "split_details",
    "notes",
}


def normalize_header(header: str) -> str:
    """
    Convert CSV headers to the snake_case keys used by the importer.
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
    Normalize header names while leaving cell values untouched.
    """

    normalized = {}

    for key, value in raw_row.items():
        normalized[normalize_header(key)] = value

    return normalized


def validate_headers(fieldnames: list[str]):
    """
    Make sure the upload has the columns the importer expects.
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
            "CSV is missing required headers: "
            + ", ".join(sorted(missing_headers))
        )


def read_uploaded_csv(file_obj) -> tuple[list[str], list[dict]]:
    """
    Read and validate the uploaded CSV without touching the database.
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
    Parse an uploaded CSV into a reviewable import batch.

    This records rows and issues only. Expenses and settlements are created
    later by the commit step.
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
