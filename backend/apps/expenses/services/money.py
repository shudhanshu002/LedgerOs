from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings


class MoneyError(ValueError):
    pass


def parse_decimal_amount(value) -> Decimal:
    """
    Converts string/number amount into Decimal safely.

    Examples:
    "1200"     -> Decimal("1200")
    "1200.50"  -> Decimal("1200.50")
    "₹1,200"   -> Decimal("1200")
    """

    if value is None:
        raise MoneyError("Amount is missing.")

    cleaned = (
        str(value)
        .strip()
        .replace("₹", "")
        .replace("$", "")
        .replace(",", "")
    )

    if cleaned == "":
        raise MoneyError("Amount is empty.")

    try:
        return Decimal(cleaned)
    except InvalidOperation as exc:
        raise MoneyError(f"Invalid amount: {value}") from exc


def rupees_to_paise(amount) -> int:
    """
    Converts INR rupees to integer paise.

    We use ROUND_HALF_UP because it is easier to explain
    and matches common financial rounding expectations.
    """

    decimal_amount = parse_decimal_amount(amount)

    paise = (decimal_amount * Decimal("100")).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )

    return int(paise)


def paise_to_rupees(paise: int) -> Decimal:
    """
    Converts integer paise back to rupees for display.
    """

    return (Decimal(paise) / Decimal("100")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def usd_to_inr_paise(amount) -> int:
    """
    Converts USD amount to INR paise using fixed configured rate.

    Assignment reason:
    Priya said the sheet pretends dollar is rupee.
    So the importer must detect USD and convert it deliberately.

    Current policy:
    1 USD = value of USD_TO_INR_RATE in .env
    """

    decimal_amount = parse_decimal_amount(amount)
    rate = Decimal(str(settings.USD_TO_INR_RATE))

    inr_amount = decimal_amount * rate

    return rupees_to_paise(inr_amount)


def to_ledger_paise(amount, currency: str) -> int:
    """
    Converts any supported currency into INR paise.

    INR:
        1200 -> 120000 paise

    USD:
        10 USD with rate 83 -> 83000 paise
    """

    normalized_currency = (currency or "INR").strip().upper()

    if normalized_currency == "INR":
        return rupees_to_paise(amount)

    if normalized_currency == "USD":
        return usd_to_inr_paise(amount)

    raise MoneyError(f"Unsupported currency: {currency}")


def allocate_remainder(total_paise: int, count: int) -> list[int]:
    """
    Splits total_paise equally across count people.

    Important:
    Integer division may leave a remainder.

    Example:
    100 paise split among 3:
    [34, 33, 33]

    Policy:
    Give one extra paise to the first N participants.
    This is deterministic and documented.
    """

    if count <= 0:
        raise MoneyError("Cannot split money between zero people.")

    base_share = total_paise // count
    remainder = total_paise % count

    shares = []

    for index in range(count):
        extra = 1 if index < remainder else 0
        shares.append(base_share + extra)

    return shares