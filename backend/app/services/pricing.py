"""
services/pricing.py — Pure invoice calculation and discount eligibility.

All arithmetic uses Decimal (ROUND_HALF_UP via money.quantize).
No DB calls — this module is safe to import and test before models exist.

Formula (PROJECT_SPEC §8.1):
    line_total   = quantity * unit_price
    subtotal     = sum(line_total for each item)
    discount     = fixed:      min(value, subtotal)
                   percentage: subtotal * value / 100
    taxable      = subtotal - discount
    tax_amount   = taxable * tax_rate / 100
    total        = taxable + tax_amount

Discount eligibility (§8.2 — pure boolean logic, no DB):
    is_active AND today in [valid_from, valid_until] AND
    used_count < usage_limit AND subtotal >= min_amount
"""

from datetime import date
from decimal import Decimal
from typing import List, Optional, TypedDict

from app.services.money import quantize, ZERO


# ---------------------------------------------------------------------------
# Line-level helpers
# ---------------------------------------------------------------------------

def calculate_line_total(quantity: int, unit_price: Decimal) -> Decimal:
    """quantize(quantity * unit_price)."""
    return quantize(Decimal(str(quantity)) * unit_price)


def calculate_subtotal(line_totals: List[Decimal]) -> Decimal:
    """Sum of line_totals (each already quantized)."""
    return sum(line_totals, ZERO)


# ---------------------------------------------------------------------------
# Discount helpers
# ---------------------------------------------------------------------------

def calculate_discount_amount(
    discount_type: str,
    discount_value: Decimal,
    subtotal: Decimal,
) -> Decimal:
    """
    Calculate the discount amount to deduct.

    For 'fixed': capped at subtotal (cannot go negative).
    For 'percentage': subtotal * value / 100, quantized.
    """
    if discount_type == "fixed":
        return min(quantize(discount_value), subtotal)
    elif discount_type == "percentage":
        return quantize(subtotal * discount_value / Decimal("100"))
    else:
        raise ValueError(f"Unknown discount type: {discount_type!r}")


def is_discount_eligible(
    discount: dict,
    subtotal: Decimal,
    today: Optional[date] = None,
) -> bool:
    """
    Pure eligibility check — no DB.

    discount dict keys (all optional except is_active, type, value):
        is_active    : bool
        valid_from   : date | None
        valid_until  : date | None
        usage_limit  : int | None
        used_count   : int
        min_amount   : Decimal
    """
    if today is None:
        today = date.today()

    if not discount.get("is_active", False):
        return False

    valid_from = discount.get("valid_from")
    if valid_from is not None and today < valid_from:
        return False

    valid_until = discount.get("valid_until")
    if valid_until is not None and today > valid_until:
        return False

    usage_limit = discount.get("usage_limit")
    used_count = discount.get("used_count", 0)
    if usage_limit is not None and used_count >= usage_limit:
        return False

    min_amount = discount.get("min_amount", ZERO)
    if subtotal < min_amount:
        return False

    return True


# ---------------------------------------------------------------------------
# Tax helper
# ---------------------------------------------------------------------------

def calculate_tax_amount(taxable: Decimal, tax_rate: Decimal) -> Decimal:
    """quantize(taxable * tax_rate / 100)."""
    return quantize(taxable * tax_rate / Decimal("100"))


# ---------------------------------------------------------------------------
# Full invoice totals
# ---------------------------------------------------------------------------

class InvoiceTotals(TypedDict):
    subtotal: Decimal
    discount_amount: Decimal
    taxable: Decimal
    tax_amount: Decimal
    total: Decimal


def calculate_invoice_totals(
    items: List[dict],               # each: {"quantity": int, "unit_price": Decimal}
    tax_rate: Decimal = ZERO,        # 0 if no tax
    discount_type: Optional[str] = None,
    discount_value: Optional[Decimal] = None,
) -> InvoiceTotals:
    """
    Compute all invoice monetary fields from raw line items.

    Returns an InvoiceTotals TypedDict with all Decimal values quantized.
    """
    line_totals = [
        calculate_line_total(item["quantity"], item["unit_price"])
        for item in items
    ]
    subtotal = calculate_subtotal(line_totals)

    if discount_type and discount_value is not None:
        discount_amount = calculate_discount_amount(discount_type, discount_value, subtotal)
    else:
        discount_amount = ZERO

    taxable = subtotal - discount_amount
    tax_amount = calculate_tax_amount(taxable, tax_rate)
    total = taxable + tax_amount

    return InvoiceTotals(
        subtotal=subtotal,
        discount_amount=discount_amount,
        taxable=taxable,
        tax_amount=tax_amount,
        total=total,
    )
