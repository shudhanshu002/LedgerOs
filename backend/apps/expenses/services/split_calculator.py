import re
from decimal import Decimal

from apps.expenses.services.money import (
    MoneyError,
    allocate_remainder,
    parse_decimal_amount,
    rupees_to_paise,
)


class SplitCalculationError(ValueError):
    pass


def normalize_split_type(split_type: str) -> str:
    """
    Normalize split labels from the API or CSV.
    """

    normalized = (split_type or "").strip().upper()

    aliases = {
        "EQUALLY": "EQUAL",
        "EQUAL_SPLIT": "EQUAL",

        "UNEQUAL": "EXACT",
        "EXACT_AMOUNT": "EXACT",

        "PERCENT": "PERCENTAGE",
        "PERCENTAGE_SPLIT": "PERCENTAGE",

        "SHARES": "SHARE",
        "BY_SHARE": "SHARE",
    }

    return aliases.get(normalized, normalized)


def clean_split_number(value: str) -> str:
    """
    Strip currency symbols, commas, and percent signs from split values.
    """

    return (
        str(value)
        .strip()
        .replace("%", "")
        .replace("₹", "")
        .replace("$", "")
        .replace(",", "")
    )


def parse_named_values(raw_value: str) -> dict[str, Decimal]:
    """
    Parse named split values such as "Aisha 700" or "Rohan:30%".
    """

    if not raw_value:
        return {}

    normalized = (
        str(raw_value)
        .replace("|", ";")
        .replace(",", ";")
    )

    result = {}

    for part in normalized.split(";"):
        item = part.strip()

        if not item:
            continue

        # Accepts:
        # Aisha:700
        # Aisha=700
        if ":" in item:
            name, value = item.split(":", 1)

        elif "=" in item:
            name, value = item.split("=", 1)

        else:
            # Accepts:
            # Aisha 700
            # Priya 30%
            # Dev 2
            match = re.match(
                r"^(?P<name>.+?)\s+(?P<value>-?\d+(?:\.\d+)?%?)$",
                item,
            )

            if not match:
                raise SplitCalculationError(
                    f"Invalid split value format: {item}. "
                    "Expected examples like 'Aisha 700', 'Aisha 30%', or 'Aisha:700'."
                )

            name = match.group("name")
            value = match.group("value")

        name = name.strip()
        value = clean_split_number(value)

        if not name:
            raise SplitCalculationError("Split participant name is empty.")

        try:
            result[name] = parse_decimal_amount(value)
        except MoneyError as exc:
            raise SplitCalculationError(str(exc)) from exc

    return result


def calculate_equal_split(
    total_paise: int,
    participants: list[str],
) -> dict[str, int]:
    """
    Split an amount equally, assigning leftover paise from the front.
    """

    if not participants:
        raise SplitCalculationError("Equal split requires at least one participant.")

    shares = allocate_remainder(total_paise, len(participants))

    return {
        participant: shares[index]
        for index, participant in enumerate(participants)
    }


def calculate_exact_split(
    total_paise: int,
    split_values_raw: str,
) -> dict[str, int]:
    """
    Use exact per-person amounts from split_details.
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Exact split requires split_details.")

    result = {
        name: rupees_to_paise(value)
        for name, value in named_values.items()
    }

    split_total = sum(result.values())

    if split_total != total_paise:
        raise SplitCalculationError(
            f"Exact split total {split_total} paise does not match "
            f"expense total {total_paise} paise."
        )

    return result


def calculate_percentage_split(
    total_paise: int,
    split_values_raw: str,
) -> dict[str, int]:
    """
    Allocate by percentages. The percentages must add up to 100.
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Percentage split requires split_details.")

    percentage_total = sum(named_values.values())

    if percentage_total != Decimal("100"):
        raise SplitCalculationError(
            f"Percentage split total must be 100, got {percentage_total}."
        )

    raw_allocations = []

    for name, percentage in named_values.items():
        exact_share = (Decimal(total_paise) * percentage) / Decimal("100")
        floor_share = int(exact_share)
        remainder = exact_share - Decimal(floor_share)

        raw_allocations.append(
            {
                "name": name,
                "floor_share": floor_share,
                "remainder": remainder,
            }
        )

    allocated = sum(item["floor_share"] for item in raw_allocations)
    remaining = total_paise - allocated

    raw_allocations.sort(
        key=lambda item: item["remainder"],
        reverse=True,
    )

    for index in range(remaining):
        raw_allocations[index]["floor_share"] += 1

    return {
        item["name"]: item["floor_share"]
        for item in raw_allocations
    }


def calculate_share_split(
    total_paise: int,
    split_values_raw: str,
) -> dict[str, int]:
    """
    Allocate by weighted shares.
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Share split requires split_details.")

    total_shares = sum(named_values.values())

    if total_shares <= 0:
        raise SplitCalculationError("Total shares must be greater than zero.")

    raw_allocations = []

    for name, shares in named_values.items():
        if shares <= 0:
            raise SplitCalculationError(
                f"Share value for {name} must be greater than zero."
            )

        exact_share = (Decimal(total_paise) * shares) / total_shares
        floor_share = int(exact_share)
        remainder = exact_share - Decimal(floor_share)

        raw_allocations.append(
            {
                "name": name,
                "floor_share": floor_share,
                "remainder": remainder,
            }
        )

    allocated = sum(item["floor_share"] for item in raw_allocations)
    remaining = total_paise - allocated

    raw_allocations.sort(
        key=lambda item: item["remainder"],
        reverse=True,
    )

    for index in range(remaining):
        raw_allocations[index]["floor_share"] += 1

    return {
        item["name"]: item["floor_share"]
        for item in raw_allocations
    }


def calculate_split(
    *,
    total_paise: int,
    split_type: str,
    participants: list[str],
    split_values_raw: str = "",
) -> dict[str, int]:
    """
    Dispatch to the split calculator for the requested split type.
    """

    normalized_split_type = normalize_split_type(split_type)

    if total_paise <= 0:
        raise SplitCalculationError("Expense amount must be greater than zero.")

    if normalized_split_type == "EQUAL":
        return calculate_equal_split(
            total_paise=total_paise,
            participants=participants,
        )

    if normalized_split_type == "EXACT":
        return calculate_exact_split(
            total_paise=total_paise,
            split_values_raw=split_values_raw,
        )

    if normalized_split_type == "PERCENTAGE":
        return calculate_percentage_split(
            total_paise=total_paise,
            split_values_raw=split_values_raw,
        )

    if normalized_split_type == "SHARE":
        return calculate_share_split(
            total_paise=total_paise,
            split_values_raw=split_values_raw,
        )

    raise SplitCalculationError(
        f"Unsupported split type: {split_type}"
    )