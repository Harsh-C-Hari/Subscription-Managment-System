"""
services/money.py — Decimal money helpers.

Rules (PROJECT_SPEC §3):
- All money is Python Decimal, NEVER float.
- Rounding: ROUND_HALF_UP to 2 decimal places at every quantization point.
- JSON serialisation: always 2-dp string via Decimal2Str from schemas/common.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Union

_TWO_PLACES = Decimal("0.01")


def quantize(value: Decimal) -> Decimal:
    """Round a Decimal to exactly 2 decimal places using ROUND_HALF_UP."""
    if not isinstance(value, Decimal):
        raise TypeError(f"quantize() requires Decimal, got {type(value).__name__}")
    return value.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def to_decimal(raw: Union[str, int, Decimal]) -> Decimal:
    """
    Convert a string or int to Decimal.
    float is explicitly rejected — callers must pass strings from JSON.
    """
    if isinstance(raw, float):
        raise TypeError(
            "float is not accepted for money values. Pass a string (e.g. '999.00')."
        )
    if isinstance(raw, Decimal):
        return raw
    try:
        return Decimal(str(raw))
    except Exception as exc:
        raise ValueError(f"Cannot convert {raw!r} to Decimal: {exc}") from exc


def money_str(value: Decimal) -> str:
    """Serialise a Decimal to the 2-dp string format used in JSON responses."""
    return f"{quantize(value):.2f}"


ZERO = Decimal("0.00")
