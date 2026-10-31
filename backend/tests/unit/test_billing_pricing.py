"""
tests/test_billing_pricing.py

Unit tests for services/pricing.py — invoice calculation and discount eligibility.
All pure Python, no DB.
"""

import pytest
from datetime import date
from decimal import Decimal

from app.services.pricing import (
    calculate_line_total,
    calculate_subtotal,
    calculate_discount_amount,
    calculate_tax_amount,
    calculate_invoice_totals,
    is_discount_eligible,
)
from app.services.money import ZERO


# ---------------------------------------------------------------------------
# Line total
# ---------------------------------------------------------------------------

class TestLineTotals:
    def test_basic(self):
        assert calculate_line_total(2, Decimal("999.00")) == Decimal("1998.00")

    def test_single_unit(self):
        assert calculate_line_total(1, Decimal("500.00")) == Decimal("500.00")

    def test_rounding_half_up(self):
        """1 × 0.005 should round UP to 0.01, not banker's 0.00."""
        assert calculate_line_total(1, Decimal("0.005")) == Decimal("0.01")

    def test_quantity_multiplier(self):
        assert calculate_line_total(3, Decimal("33.333")) == Decimal("99.999").quantize(Decimal("0.01"))

    def test_zero_price(self):
        assert calculate_line_total(5, ZERO) == ZERO


class TestSubtotal:
    def test_sum_of_lines(self):
        lines = [Decimal("100.00"), Decimal("200.00"), Decimal("300.00")]
        assert calculate_subtotal(lines) == Decimal("600.00")

    def test_empty(self):
        assert calculate_subtotal([]) == ZERO


# ---------------------------------------------------------------------------
# Discount calculations
# ---------------------------------------------------------------------------

class TestDiscountAmount:
    def test_fixed_normal(self):
        """Fixed discount smaller than subtotal."""
        result = calculate_discount_amount("fixed", Decimal("100.00"), Decimal("500.00"))
        assert result == Decimal("100.00")

    def test_fixed_capped_at_subtotal(self):
        """Fixed discount larger than subtotal is capped at subtotal."""
        result = calculate_discount_amount("fixed", Decimal("600.00"), Decimal("500.00"))
        assert result == Decimal("500.00")

    def test_fixed_equal_to_subtotal(self):
        result = calculate_discount_amount("fixed", Decimal("500.00"), Decimal("500.00"))
        assert result == Decimal("500.00")

    def test_percentage_10(self):
        result = calculate_discount_amount("percentage", Decimal("10.00"), Decimal("1000.00"))
        assert result == Decimal("100.00")

    def test_percentage_rounding(self):
        """10% of 999.00 = 99.90 exactly."""
        result = calculate_discount_amount("percentage", Decimal("10.00"), Decimal("999.00"))
        assert result == Decimal("99.90")

    def test_unknown_type_raises(self):
        with pytest.raises(ValueError):
            calculate_discount_amount("voucher", Decimal("10.00"), Decimal("100.00"))


# ---------------------------------------------------------------------------
# Tax
# ---------------------------------------------------------------------------

class TestTaxAmount:
    def test_gst_18_percent(self):
        """taxable=1998.00, rate=18% → 359.64."""
        result = calculate_tax_amount(Decimal("1998.00"), Decimal("18.00"))
        assert result == Decimal("359.64")

    def test_zero_rate(self):
        assert calculate_tax_amount(Decimal("1000.00"), ZERO) == ZERO

    def test_100_percent_tax(self):
        assert calculate_tax_amount(Decimal("100.00"), Decimal("100.00")) == Decimal("100.00")


# ---------------------------------------------------------------------------
# Full invoice totals (the canonical example from API_CONTRACT §11)
# ---------------------------------------------------------------------------

class TestInvoiceTotals:
    def test_api_contract_example(self):
        """
        2 × 999.00 @ 18% GST, no discount.
        Expected: subtotal=1998.00, discount=0.00, taxable=1998.00,
                  tax=359.64, total=2357.64
        """
        items = [{"quantity": 2, "unit_price": Decimal("999.00")}]
        totals = calculate_invoice_totals(items, tax_rate=Decimal("18.00"))
        assert totals["subtotal"] == Decimal("1998.00")
        assert totals["discount_amount"] == ZERO
        assert totals["taxable"] == Decimal("1998.00")
        assert totals["tax_amount"] == Decimal("359.64")
        assert totals["total"] == Decimal("2357.64")

    def test_no_tax_no_discount(self):
        items = [{"quantity": 1, "unit_price": Decimal("500.00")}]
        totals = calculate_invoice_totals(items)
        assert totals["subtotal"] == Decimal("500.00")
        assert totals["tax_amount"] == ZERO
        assert totals["total"] == Decimal("500.00")

    def test_with_percentage_discount_and_tax(self):
        """
        subtotal=1000.00, 10% discount → discount=100, taxable=900,
        18% tax → tax=162.00, total=1062.00
        """
        items = [{"quantity": 1, "unit_price": Decimal("1000.00")}]
        totals = calculate_invoice_totals(
            items,
            tax_rate=Decimal("18.00"),
            discount_type="percentage",
            discount_value=Decimal("10.00"),
        )
        assert totals["subtotal"] == Decimal("1000.00")
        assert totals["discount_amount"] == Decimal("100.00")
        assert totals["taxable"] == Decimal("900.00")
        assert totals["tax_amount"] == Decimal("162.00")
        assert totals["total"] == Decimal("1062.00")

    def test_fixed_discount_capped(self):
        """Fixed discount > subtotal → discount capped, taxable=0, total=0."""
        items = [{"quantity": 1, "unit_price": Decimal("500.00")}]
        totals = calculate_invoice_totals(
            items,
            discount_type="fixed",
            discount_value=Decimal("600.00"),
        )
        assert totals["discount_amount"] == Decimal("500.00")
        assert totals["taxable"] == ZERO
        assert totals["total"] == ZERO

    def test_multiple_items(self):
        """Multiple line items are summed correctly."""
        items = [
            {"quantity": 2, "unit_price": Decimal("100.00")},
            {"quantity": 3, "unit_price": Decimal("50.00")},
        ]
        totals = calculate_invoice_totals(items)
        assert totals["subtotal"] == Decimal("350.00")

    def test_total_math_identity(self):
        """subtotal - discount + tax == total (the DB CHECK constraint)."""
        items = [{"quantity": 5, "unit_price": Decimal("123.45")}]
        totals = calculate_invoice_totals(
            items,
            tax_rate=Decimal("9.00"),
            discount_type="percentage",
            discount_value=Decimal("5.00"),
        )
        expected_total = totals["subtotal"] - totals["discount_amount"] + totals["tax_amount"]
        assert totals["total"] == expected_total


# ---------------------------------------------------------------------------
# Discount eligibility
# ---------------------------------------------------------------------------

class TestDiscountEligibility:
    def _discount(self, **overrides) -> dict:
        base = {
            "is_active": True,
            "valid_from": None,
            "valid_until": None,
            "usage_limit": None,
            "used_count": 0,
            "min_amount": ZERO,
        }
        base.update(overrides)
        return base

    def test_fully_eligible(self):
        d = self._discount()
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_inactive(self):
        d = self._discount(is_active=False)
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is False

    def test_not_started_yet(self):
        d = self._discount(valid_from=date(2026, 11, 1))
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is False

    def test_started_today(self):
        d = self._discount(valid_from=date(2026, 10, 31))
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_expired(self):
        d = self._discount(valid_until=date(2026, 10, 30))
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is False

    def test_expires_today(self):
        d = self._discount(valid_until=date(2026, 10, 31))
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_usage_limit_reached(self):
        d = self._discount(usage_limit=100, used_count=100)
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is False

    def test_usage_limit_one_below(self):
        d = self._discount(usage_limit=100, used_count=99)
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_unlimited_usage(self):
        """usage_limit=None means unlimited."""
        d = self._discount(usage_limit=None, used_count=9999)
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_min_amount_not_met(self):
        d = self._discount(min_amount=Decimal("100.00"))
        assert is_discount_eligible(d, Decimal("99.99"), date(2026, 10, 31)) is False

    def test_min_amount_exactly_met(self):
        d = self._discount(min_amount=Decimal("100.00"))
        assert is_discount_eligible(d, Decimal("100.00"), date(2026, 10, 31)) is True

    def test_all_conditions_combined_fail_on_one(self):
        """All conditions good except limit reached → False."""
        d = self._discount(
            is_active=True,
            valid_from=date(2026, 1, 1),
            valid_until=date(2026, 12, 31),
            usage_limit=50,
            used_count=50,   # ← exactly at limit
            min_amount=ZERO,
        )
        assert is_discount_eligible(d, Decimal("500.00"), date(2026, 10, 31)) is False
