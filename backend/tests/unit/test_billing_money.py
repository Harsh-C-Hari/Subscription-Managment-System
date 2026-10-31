"""
tests/test_billing_money.py

Unit tests for services/money.py.
All tests are pure Python — no DB, no FastAPI app.
"""

import pytest
from decimal import Decimal

from app.services.money import quantize, to_decimal, money_str, ZERO


class TestQuantize:
    def test_round_half_up_positive(self):
        """0.005 rounds UP to 0.01, not down (banker's rounding would give 0.00)."""
        assert quantize(Decimal("0.005")) == Decimal("0.01")

    def test_round_half_up_below_half(self):
        assert quantize(Decimal("0.004")) == Decimal("0.00")

    def test_round_half_up_negative(self):
        """For negative: -0.005 rounds to -0.01 (away from zero)."""
        assert quantize(Decimal("-0.005")) == Decimal("-0.01")

    def test_exact_two_dp_unchanged(self):
        assert quantize(Decimal("999.99")) == Decimal("999.99")

    def test_zero(self):
        assert quantize(ZERO) == Decimal("0.00")

    def test_large_value(self):
        assert quantize(Decimal("99999999.995")) == Decimal("100000000.00")

    def test_requires_decimal(self):
        with pytest.raises(TypeError):
            quantize(1.5)  # type: ignore[arg-type]

    def test_requires_decimal_not_int(self):
        with pytest.raises(TypeError):
            quantize(1)  # type: ignore[arg-type]


class TestToDecimal:
    def test_from_string(self):
        assert to_decimal("999.9") == Decimal("999.9")

    def test_from_int(self):
        assert to_decimal(100) == Decimal("100")

    def test_from_decimal_passthrough(self):
        d = Decimal("42.50")
        assert to_decimal(d) is d

    def test_float_rejected(self):
        with pytest.raises(TypeError, match="float is not accepted"):
            to_decimal(1.1)

    def test_invalid_string_raises(self):
        with pytest.raises(ValueError):
            to_decimal("not-a-number")

    def test_zero_string(self):
        assert to_decimal("0.00") == Decimal("0.00")

    def test_negative_string(self):
        assert to_decimal("-50.25") == Decimal("-50.25")


class TestMoneyStr:
    def test_formats_two_decimal_places(self):
        assert money_str(Decimal("1000")) == "1000.00"

    def test_rounds_half_up_in_str(self):
        assert money_str(Decimal("0.005")) == "0.01"

    def test_already_two_dp(self):
        assert money_str(Decimal("2357.64")) == "2357.64"

    def test_zero(self):
        assert money_str(ZERO) == "0.00"

    def test_large(self):
        assert money_str(Decimal("999999.99")) == "999999.99"
