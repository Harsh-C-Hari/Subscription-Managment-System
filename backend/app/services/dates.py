"""
services/dates.py — Billing date advancement.

Spec §8.5 rules:
  daily  : period_start + 1 day
  weekly : period_start + 7 days
  monthly: add 1 month using the billing_anchor_day (day of start_date).
            Result = min(anchor_day, last_day_of_target_month).
            CRITICAL: always advance from the anchor-based date, NEVER from
            the previously clamped date, otherwise Feb 28 + 1 month = Mar 28
            instead of the correct Mar 31.
  yearly : same anchor rule, +1 year.

Uses dateutil.relativedelta (already in requirements.txt).
"""

import calendar
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta


BILLING_PERIODS = {"daily", "weekly", "monthly", "yearly"}


def _last_day_of_month(year: int, month: int) -> int:
    """Return the last calendar day of a given year/month."""
    return calendar.monthrange(year, month)[1]


def _clamp_day(year: int, month: int, anchor_day: int) -> int:
    """Return min(anchor_day, last_day_of_month(year, month))."""
    return min(anchor_day, _last_day_of_month(year, month))


def advance_date(period_start: date, billing_period: str, anchor_day: int) -> date:
    """
    Compute the next billing date after period_start.

    Parameters
    ----------
    period_start   : The current billing period's start date (i.e. the current
                     next_billing_date that is being billed today).
    billing_period : One of 'daily', 'weekly', 'monthly', 'yearly'.
    anchor_day     : The day-of-month stored on the subscription
                     (= day(start_date), range 1–31).

    Returns
    -------
    The new next_billing_date.
    """
    if billing_period not in BILLING_PERIODS:
        raise ValueError(f"Unknown billing_period: {billing_period!r}")

    if billing_period == "daily":
        return period_start + timedelta(days=1)

    if billing_period == "weekly":
        return period_start + timedelta(weeks=1)

    if billing_period == "monthly":
        # Re-anchor: build an anchor date in the *same* year/month as period_start,
        # clamped to the actual days in that month.
        clamped_anchor_day = _clamp_day(period_start.year, period_start.month, anchor_day)
        anchor_date = date(period_start.year, period_start.month, clamped_anchor_day)
        # Advance by one month from the anchor date.
        raw_next = anchor_date + relativedelta(months=1)
        # Clamp again in the target month (e.g. anchor=31 in February → 28/29).
        final_day = _clamp_day(raw_next.year, raw_next.month, anchor_day)
        return date(raw_next.year, raw_next.month, final_day)

    # yearly
    clamped_anchor_day = _clamp_day(period_start.year, period_start.month, anchor_day)
    anchor_date = date(period_start.year, period_start.month, clamped_anchor_day)
    raw_next = anchor_date + relativedelta(years=1)
    final_day = _clamp_day(raw_next.year, raw_next.month, anchor_day)
    return date(raw_next.year, raw_next.month, final_day)


def compute_period_end(period_start: date, billing_period: str, anchor_day: int) -> date:
    """
    period_end = advance_date(period_start) - 1 day  (spec §8.4).
    """
    return advance_date(period_start, billing_period, anchor_day) - timedelta(days=1)


def compute_end_date(start_date: date, billing_period: str, duration_periods: int) -> date:
    """
    Compute the subscription end_date from start_date + duration_periods advances.
    end_date is the last day of the final period, i.e.
    advance_date applied duration_periods times, then − 1 day.
    """
    anchor_day = start_date.day
    current = start_date
    for _ in range(duration_periods):
        current = advance_date(current, billing_period, anchor_day)
    return current - timedelta(days=1)
