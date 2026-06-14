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
    Normalizes split type from CSV/API.

    Supported:
    - EQUAL
    - EXACT
    - PERCENTAGE
    - SHARE
    """

    normalized = (split_type or "").strip().upper()

    aliases = {
        "EQUALLY": "EQUAL",
        "EQUAL_SPLIT": "EQUAL",
        "EXACT_AMOUNT": "EXACT",
        "PERCENT": "PERCENTAGE",
        "PERCENTAGE_SPLIT": "PERCENTAGE",
        "SHARES": "SHARE",
        "BY_SHARE": "SHARE",
    }

    return aliases.get(normalized, normalized)


def parse_named_values(raw_value: str) -> dict[str, Decimal]:
    """
    Parses CSV split value strings.

    Supported examples:

    Aisha:500,Rohan:500,Priya:700
    Aisha:20;Rohan:30;Priya:50
    Aisha:1|Rohan:2|Priya:1

    Returns:

    {
      "Aisha": Decimal("500"),
      "Rohan": Decimal("500")
    }
    """

    if not raw_value:
        return {}

    normalized = (
        str(raw_value)
        .replace("|", ",")
        .replace(";", ",")
    )

    result = {}

    for part in normalized.split(","):
        item = part.strip()

        if not item:
            continue

        if ":" not in item:
            raise SplitCalculationError(
                f"Invalid split value format: {item}. Expected Name:Value."
            )

        name, value = item.split(":", 1)
        name = name.strip()
        value = value.strip()

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
    Equal split.

    Example:
    ₹100 split among 3 people:

    total_paise = 10000

    Result:
    {
      "Aisha": 3334,
      "Rohan": 3333,
      "Priya": 3333
    }

    Remainder policy:
    Extra paise are assigned to earlier participants.
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
    Exact split.

    Example:
    raw:
    Aisha:500,Rohan:700

    Means:
    Aisha owes ₹500
    Rohan owes ₹700
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Exact split requires split values.")

    result = {
        name: rupees_to_paise(value)
        for name, value in named_values.items()
    }

    split_total = sum(result.values())

    if split_total != total_paise:
        raise SplitCalculationError(
            f"Exact split total {split_total} paise does not match expense total {total_paise} paise."
        )

    return result


def calculate_percentage_split(
    total_paise: int,
    split_values_raw: str,
) -> dict[str, int]:
    """
    Percentage split.

    Example:
    Aisha:50,Rohan:25,Priya:25

    Means:
    Aisha owes 50% of total.
    Rohan owes 25%.
    Priya owes 25%.
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Percentage split requires split values.")

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
    Share-based split.

    Example:
    Aisha:1,Rohan:2,Priya:1

    Total shares = 4

    If expense is ₹400:
    Aisha owes ₹100
    Rohan owes ₹200
    Priya owes ₹100
    """

    named_values = parse_named_values(split_values_raw)

    if not named_values:
        raise SplitCalculationError("Share split requires split values.")

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
    Main split calculation entry point.

    Returns:
    {
      "Aisha": 10000,
      "Rohan": 10000
    }

    All returned values are in paise.
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