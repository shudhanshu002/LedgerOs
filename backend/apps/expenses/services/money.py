from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.conf import settings


class MoneyError(ValueError):
    pass


def parse_decimal_amount(value) -> Decimal:
    """
    Parse a user or CSV amount into Decimal.
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
    Convert INR rupees to integer paise.

    ROUND_HALF_UP matches the rounding people expect for money.
    """

    decimal_amount = parse_decimal_amount(amount)

    paise = (decimal_amount * Decimal("100")).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )

    return int(paise)


def paise_to_rupees(paise: int) -> Decimal:
    """
    Convert integer paise back to rupees for display.
    """

    return (Decimal(paise) / Decimal("100")).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def usd_to_inr_paise(amount) -> int:
    """
    Convert USD to INR paise using the configured fixed rate.
    """

    decimal_amount = parse_decimal_amount(amount)
    rate = Decimal(str(settings.USD_TO_INR_RATE))

    inr_amount = decimal_amount * rate

    return rupees_to_paise(inr_amount)


def to_ledger_paise(amount, currency: str) -> int:
    """
    Convert any supported currency into the ledger's INR paise value.
    """

    normalized_currency = (currency or "INR").strip().upper()

    if normalized_currency == "INR":
        return rupees_to_paise(amount)

    if normalized_currency == "USD":
        return usd_to_inr_paise(amount)

    raise MoneyError(f"Unsupported currency: {currency}")


def allocate_remainder(total_paise: int, count: int) -> list[int]:
    """
    Split paise evenly and assign any leftover paise from the front.
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