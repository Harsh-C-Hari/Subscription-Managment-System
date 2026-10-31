"""
tests/test_billing_dates.py

Unit tests for services/dates.py — the billing date advancement logic.

CRITICAL edge cases covered:
  - Month-end anchor (31 → Feb): the re-anchor rule must yield Mar 31, not Mar 28.
  - Leap day yearly: Feb 29 anchor in non-leap years clamps to Feb 28 and
    snaps back to Feb 29 when the year is leap again.
  - All four billing periods (daily, weekly, monthly, yearly).
"""

import pytest
from datetime import date

from app.services.dates import advance_date, compute_period_end, compute_end_date


# ---------------------------------------------------------------------------
# Daily
# ---------------------------------------------------------------------------

class TestDaily:
    def test_simple(self):
        assert advance_date(date(2026, 10, 31), "daily", 31) == date(2026, 11, 1)

    def test_month_end(self):
        assert advance_date(date(2026, 1, 31), "daily", 31) == date(2026, 2, 1)

    def test_year_end(self):
        assert advance_date(date(2026, 12, 31), "daily", 31) == date(2027, 1, 1)


# ---------------------------------------------------------------------------
# Weekly
# ---------------------------------------------------------------------------

class TestWeekly:
    def test_simple(self):
        assert advance_date(date(2026, 10, 28), "weekly", 3) == date(2026, 11, 4)

    def test_crosses_month(self):
        assert advance_date(date(2026, 10, 30), "weekly", 30) == date(2026, 11, 6)


# ---------------------------------------------------------------------------
# Monthly — anchor day logic
# ---------------------------------------------------------------------------

class TestMonthlyAnchor:
    def test_normal_advance(self):
        """Anchor 15: Jan 15 → Feb 15."""
        assert advance_date(date(2026, 1, 15), "monthly", 15) == date(2026, 2, 15)

    def test_anchor_31_jan_to_feb_non_leap(self):
        """anchor=31: Jan 31 → Feb 28 (2026 is not a leap year)."""
        assert advance_date(date(2026, 1, 31), "monthly", 31) == date(2026, 2, 28)

    def test_anchor_31_feb_to_mar_NON_LEAP_CRITICAL(self):
        """
        THE KEY TEST: anchor=31, period_start=Feb 28 (non-leap).
        Naive approach: Feb 28 + relativedelta(months=1) = Mar 28.  WRONG.
        Correct (re-anchor): anchor_date = Feb 28, +1 month = Mar 28 ->
        but we must clamp to anchor=31 in March = Mar 31.  CORRECT.
        """
        assert advance_date(date(2026, 2, 28), "monthly", 31) == date(2026, 3, 31)

    def test_anchor_31_mar_to_apr(self):
        """anchor=31: Mar 31 → Apr 30 (April has only 30 days)."""
        assert advance_date(date(2026, 3, 31), "monthly", 31) == date(2026, 4, 30)

    def test_anchor_31_apr_to_may(self):
        """anchor=31: Apr 30 → May 31 (May has 31 days, anchor snaps back)."""
        assert advance_date(date(2026, 4, 30), "monthly", 31) == date(2026, 5, 31)

    def test_anchor_31_jan_to_feb_leap(self):
        """anchor=31: Jan 31 2028 → Feb 29 2028 (2028 is a leap year)."""
        assert advance_date(date(2028, 1, 31), "monthly", 31) == date(2028, 2, 29)

    def test_anchor_31_feb_to_mar_LEAP(self):
        """anchor=31: Feb 29 2028 → Mar 31 2028."""
        assert advance_date(date(2028, 2, 29), "monthly", 31) == date(2028, 3, 31)

    def test_anchor_30_in_february_non_leap(self):
        """anchor=30: Jan 30 → Feb 28 (non-leap)."""
        assert advance_date(date(2026, 1, 30), "monthly", 30) == date(2026, 2, 28)

    def test_anchor_28_every_month(self):
        """anchor=28: always lands on 28th regardless of month length."""
        assert advance_date(date(2026, 1, 28), "monthly", 28) == date(2026, 2, 28)
        assert advance_date(date(2026, 2, 28), "monthly", 28) == date(2026, 3, 28)

    def test_year_boundary(self):
        """anchor=15: Dec 15 → Jan 15 next year."""
        assert advance_date(date(2026, 12, 15), "monthly", 15) == date(2027, 1, 15)


# ---------------------------------------------------------------------------
# Yearly — leap-day anchor
# ---------------------------------------------------------------------------

class TestYearlyAnchor:
    def test_normal_advance(self):
        """anchor=15, Mar 15: +1 year = Mar 15 next year."""
        assert advance_date(date(2026, 3, 15), "yearly", 15) == date(2027, 3, 15)

    def test_leap_day_to_non_leap(self):
        """anchor=29: Feb 29 2024 → Feb 28 2025 (2025 is not a leap year)."""
        assert advance_date(date(2024, 2, 29), "yearly", 29) == date(2025, 2, 28)

    def test_leap_day_non_leap_to_non_leap(self):
        """anchor=29: Feb 28 2025 → Feb 28 2026 (2026 not leap)."""
        assert advance_date(date(2025, 2, 28), "yearly", 29) == date(2026, 2, 28)

    def test_leap_day_returns_on_leap_year(self):
        """anchor=29: Feb 28 2027 → Feb 29 2028 (2028 IS leap — snaps back!)."""
        assert advance_date(date(2027, 2, 28), "yearly", 29) == date(2028, 2, 29)

    def test_anchor_31_non_feb(self):
        """anchor=31: Jan 31 → Jan 31 next year."""
        assert advance_date(date(2026, 1, 31), "yearly", 31) == date(2027, 1, 31)


# ---------------------------------------------------------------------------
# Period end
# ---------------------------------------------------------------------------

class TestPeriodEnd:
    def test_monthly_period_end(self):
        """period_end = advance_date - 1 day."""
        # Jan 31 monthly -> next = Feb 28, period_end = Feb 27
        assert compute_period_end(date(2026, 1, 31), "monthly", 31) == date(2026, 2, 27)

    def test_daily_period_end(self):
        assert compute_period_end(date(2026, 10, 1), "daily", 1) == date(2026, 10, 1)

    def test_weekly_period_end(self):
        assert compute_period_end(date(2026, 10, 1), "weekly", 1) == date(2026, 10, 7)


# ---------------------------------------------------------------------------
# Subscription end_date (duration_periods advances)
# ---------------------------------------------------------------------------

class TestComputeEndDate:
    def test_12_monthly_periods_anchor_15(self):
        """12 monthly periods from Nov 15 2026 → last day of period 12."""
        start = date(2026, 11, 15)
        # After 12 advances: Nov15 → Dec15 → Jan15 → ... → Nov15 2027
        # end_date = Nov 15 2027 - 1 day = Nov 14 2027
        result = compute_end_date(start, "monthly", 12)
        assert result == date(2027, 11, 14)

    def test_1_yearly(self):
        """1 yearly period from Jan 1 2026 → end Dec 31 2026."""
        result = compute_end_date(date(2026, 1, 1), "yearly", 1)
        assert result == date(2026, 12, 31)


# ---------------------------------------------------------------------------
# Invalid period
# ---------------------------------------------------------------------------

class TestInvalidPeriod:
    def test_unknown_period_raises(self):
        with pytest.raises(ValueError, match="Unknown billing_period"):
            advance_date(date(2026, 1, 1), "biweekly", 1)
