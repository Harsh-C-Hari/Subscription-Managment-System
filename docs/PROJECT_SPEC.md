# PROJECT_SPEC — Brightloop Subscription Management System

Owner: Harsh (Person 1, Technical Lead). Changes to this file go through Person 1 only.

## 1. Purpose
Brightloop Software sells software on a subscription basis. This system lets staff manage products, plans, customers and subscriptions, automatically generates invoices for each billing period, records payments, and shows revenue/outstanding/overdue figures. Customers get a portal to see their own subscriptions, invoices and payments.

## 2. Functional requirements
1. Authentication (register, login, JWT) with roles: `admin`, `staff`, `customer`.
2. Products and product variants.
3. Plans with billing period `daily | weekly | monthly | yearly`.
4. Customer management (customers are `users` with role `customer`).
5. Quotation templates (reusable item lists).
6. Subscription lifecycle: `draft -> quotation -> confirmed -> active -> closed` (plus `paused`).
7. Invoice generation from active subscriptions (single and bulk).
8. Taxes and discounts (admin-managed).
9. Payment recording incl. partial payments.
10. Dashboard: revenue, outstanding, overdue, subscription counts.
11. Customer portal (own data only).
12. Role-based access control on every endpoint.

## 3. Non-functional requirements
- Money: PostgreSQL `NUMERIC(12,2)`, Python `Decimal`, never float. Rounding `ROUND_HALF_UP` to 2 dp.
- IDs: UUID primary keys.
- Security: bcrypt password hashing, JWT (HS256) with expiry, CORS limited to frontend origin, every endpoint has an explicit permission check, customers filtered by `customer_id == current_user.id` in the query itself, no secrets in git, Pydantic validation on all input.
- Integrity: FK constraints, CHECK constraints, UNIQUE constraints for duplicate-billing prevention, transactions for invoice generation and payments.
- Consistency: one error format, one pagination format (see API_CONTRACT).
- Performance: indexes on FKs and filter columns; pagination everywhere.

## 4. Architecture
Modular monolith: one React SPA, one FastAPI app, one PostgreSQL DB. REST/JSON under `/api/v1`.

```
Browser (React/Vite :5173) --Axios--> FastAPI (:8000 /api/v1) --SQLAlchemy--> PostgreSQL (:5432)
```

Repository layout:
```
backend/
  app/
    main.py              # P1: app factory, router registration
    core/                # P1: config.py, security.py, deps.py (get_db, get_current_user, require_roles)
    db/                  # P1: base.py (Base), session.py
    models/              # P1: user, password_reset_token, product, product_variant, plan
                         # P2: subscription, subscription_item, quotation_template(+items), tax, discount, invoice, invoice_item, payment
    schemas/             # per-domain pydantic files (owner = owner of the domain)
    routers/             # per-domain router files
    services/            # P2: billing_service, subscription_service, discount_service, tax_service, payment_service
    seed.py              # P1
  alembic/               # P1 sets up; migration ownership rules in DEVELOPMENT_WORKFLOW
  tests/
frontend/
  src/
    api/client.js        # P3: the ONLY axios instance
    context/AuthContext.jsx   # P3
    components/layout|ui/     # P3
    pages/               # P3: Login, Register, Dashboard, Products, Plans, Customers
    pages/billing/       # P4: Subscriptions*, Invoices*, Payments*, Taxes, Discounts, Quotations
    pages/portal/        # P4: customer portal
    api/billing.js       # P4: API wrappers for billing endpoints
    App.jsx, routes      # P3 (P4 adds routes only via the agreed routes file, see TEAM_TASKS)
docs/
```

## 5. Technology stack
Frontend: React, Vite, JavaScript, Tailwind CSS, React Router, Axios, Lucide React, Recharts.
Backend: Python 3.11+, FastAPI, SQLAlchemy 2.x, Pydantic v2, Alembic, python-jose (JWT), passlib[bcrypt].
Database: PostgreSQL 15+.

## 6. User roles
| Capability | admin | staff | customer |
|---|---|---|---|
| Create staff users | yes | no | no |
| Manage taxes and discounts | yes | read only | no |
| Products/variants/plans create/edit | yes | read only | read only (active) |
| Customers list/create/edit | yes | yes | own profile only |
| Subscriptions create/manage | yes | yes | read own |
| Invoices generate/confirm/cancel | yes | yes | read own |
| Payments record | yes | yes | no |
| Dashboard | yes | yes | no |
| Customer portal | n/a | n/a | yes |

## 7. Main workflows
1. Admin seeds -> logs in -> creates product, variant, plan.
2. Customer registers (role forced to `customer`) or staff creates customer.
3. Staff creates subscription (draft) with items -> (optional quotation) -> confirm -> activate (sets `start_date`, `next_billing_date`).
4. Staff/admin runs invoice generation (single subscription or bulk `run-billing`).
5. Invoice is created `draft`, staff confirms it (-> `confirmed`).
6. Payment recorded; invoice becomes `partially_paid` or `paid`.
7. Dashboard reflects revenue, outstanding, overdue.

## 8. Billing business rules (authoritative)

### 8.1 Invoice calculation (all Decimal, 2 dp, ROUND_HALF_UP)
```
line_total   = quantity * unit_price
subtotal     = sum(line_total)
discount     = fixed: min(value, subtotal)
               percentage: subtotal * value / 100
taxable      = subtotal - discount
tax_amount   = taxable * tax_rate / 100
total        = taxable + tax_amount
```
Tax rate is taken from the subscription's `tax_id` (nullable = 0%). Discount is from the subscription's `discount_id` (nullable = none). Values are **snapshotted** onto the invoice (`tax_rate`, `discount_amount`) so later edits to tax/discount never change old invoices.

### 8.2 Discount validation
A discount applies only if: `is_active`, today within `valid_from..valid_until` (nulls = open), `used_count < usage_limit` (null = unlimited), and `subtotal >= min_amount`. Usage is incremented inside the invoice-generation transaction using `UPDATE discounts SET used_count = used_count + 1 WHERE id = :id AND (usage_limit IS NULL OR used_count < usage_limit)`; if 0 rows updated, the invoice is generated without the discount.

### 8.3 Payments
- `amount > 0`. Reject if `amount > outstanding` (HTTP 422, code `OVERPAYMENT`). Overpayment is NOT supported.
- Invoice must be `confirmed` or `partially_paid`.
- After insert: `paid = SUM(payments.amount)`; if `paid == total` -> `paid`; elif `paid > 0` -> `partially_paid`.
- `outstanding = total - paid`. Lock invoice row (`SELECT ... FOR UPDATE`) while recording.

### 8.4 Recurring billing
Eligible: `status = 'active'` AND `next_billing_date <= today` AND (`end_date IS NULL OR next_billing_date <= end_date`). Skip `paused`, `closed`, and anything else.
Each invoice covers `[period_start, period_end]` where `period_start = next_billing_date` and `period_end = advance(period_start) - 1 day`.
**Duplicate prevention:** `UNIQUE (subscription_id, period_start)` on invoices (partial: `WHERE status <> 'cancelled'` so a cancelled invoice can be regenerated). Generation catches the integrity error and reports the subscription as `skipped_duplicate`.
In ONE transaction: insert invoice + items, apply discount usage, set `subscription.next_billing_date = advance(period_start)`. Any failure rolls back everything for that subscription (per-subscription transaction so one failure doesn't block others in bulk).
After advancing, if `end_date` is set and `next_billing_date > end_date`, set status `closed` (when the plan has `auto_close = true`).

### 8.5 Date advancement
- daily: +1 day. weekly: +7 days.
- monthly: add 1 month using the **anchor day** (`billing_anchor_day` = day of `start_date`). Result day = `min(anchor_day, last day of target month)`. Example: anchor 31 -> Jan 31, Feb 28/29, Mar 31, Apr 30.
- yearly: +1 year, same anchor rule (Feb 29 -> Feb 28 in non-leap years, back to Feb 29 in leap years).
Use `dateutil.relativedelta` from the *anchor-based* date, never from the previous clamped date.

### 8.6 Subscription state machine
```
draft -> quotation -> confirmed -> active -> closed
draft -> confirmed (quotation optional)
active <-> paused
any non-closed -> closed
```
Invalid transitions return 409 `INVALID_TRANSITION`.
Invoice: `draft -> confirmed -> partially_paid -> paid`; `draft|confirmed -> cancelled`. Paid or payment-bearing invoices cannot be cancelled.

## 9. MVP priorities
**P0 (demo-critical):** auth + roles, products, plans, customers, subscription create/activate, invoice generation, duplicate-billing prevention, payment recording, dashboard metrics.
**P1 (basic):** variants, taxes, discounts, quotation templates, invoice print (browser print CSS), customer portal, pause/close/renew.
**P2 (deferred):** real email, payment gateway, background scheduler, forecasting, audit logs.
Security checks (auth on every endpoint, ownership filtering, input validation) are NOT deferred.

## 10. Deferred features
Email delivery, payment gateway, scheduled billing, revenue forecasting, audit trail, password-reset email sending (token table exists, endpoints are P1 stubs returning the token in dev only).
