from pathlib import Path


def humanize_filename(filename: str) -> str:
    """
    Converts a stored filename into a readable label for API/UI display.

    The original filename stays unchanged for audit and traceability.
    """

    if not filename:
        return "Uploaded File"

    path = Path(filename)
    stem = path.stem.replace("_", " ").replace("-", " ").strip()
    suffix = path.suffix.lower()

    words = [word.capitalize() for word in stem.split() if word]
    label = " ".join(words) if words else "Uploaded File"

    return f"{label}{suffix}"
