# TESTING_PLAN

## 1. Final demo scenario (acceptance — run at ~4:00 PM on `integration`)
Prereqs: PostgreSQL running, `alembic upgrade head`, `python -m app.seed`, backend on :8000, frontend on :5173.

| # | Action (UI) | Expected |
|---|---|---|
| 1 | Admin logs in (`admin@brightloop.com`) | Dashboard loads; sidebar shows all admin items |
| 2 | Admin creates product "Brightloop CRM", base price 999.00 | Appears in Products list |
| 3 | Admin creates plan "CRM Monthly", monthly, 999.00, 12 periods | Appears in Plans list |
| 3b | Admin creates tax "GST" 18% and discount "LAUNCH10" 10% (P1 items) | Listed in Taxes / Discounts |
| 4 | Customer registers via /register (`ann@example.com`) | Account created with role customer |
| 5 | Staff (created by admin via /auth/staff) creates subscription for Ann: plan, GST, qty 2 | Status `draft`, number SUB-… |
| 6 | Staff clicks Confirm then Activate | Status `active`, `next_billing_date` = today |
| 7 | Staff clicks Generate invoice | Invoice `draft`; subtotal 1998.00; tax 359.64 (no discount); total 2357.64 |
| 7b | Click Generate invoice again | Friendly error DUPLICATE_BILLING; no second invoice |
| 7c | Staff confirms invoice | Status `confirmed` |
| 8 | Staff records payment 1000.00 (UPI) | Invoice `partially_paid`, outstanding 1357.64 |
| 8b | Staff tries to pay 5000.00 | Error OVERPAYMENT |
| 9 | Staff records 1357.64 | Invoice `paid`, outstanding 0.00 |
| 10 | Dashboard refresh | total_revenue 2357.64, outstanding 0.00, active_subscriptions +1 |
| 11 | Ann logs in | Sees portal: only her subscription, invoice, payments; cannot open `/products` admin actions or other customers |
| 12 | Run billing (bulk) the same day | created 0 (next billing date advanced), no duplicates |

## 2. Backend API tests (pytest, `backend/tests/`)
Run: `cd backend; .\.venv\Scripts\Activate.ps1; pytest -q`. Use a separate DB `brightloop_test` (env `TEST_DATABASE_URL`).

**P1 (`test_auth.py`, `test_catalog.py`, `test_customers.py`)**
- register creates customer even if body sends `"role":"admin"`; duplicate email -> 409; short password -> 422
- login ok / wrong password 401; `/auth/me` without token 401
- staff creation: admin 201, staff 403, customer 403
- products/plans/variants CRUD: admin ok; staff/customer write -> 403; negative price -> 422
- customer GET another customer id -> 404; customer cannot list `/customers` (403)
- error body always matches `{error:{code,message}}`

**P2 (`test_billing_unit.py`, `test_billing_api.py`)**
- money: ROUND_HALF_UP (`0.005 -> 0.01`), totals = contract formula
- dates: monthly anchor 31: Jan 31 -> Feb 28 -> Mar 31 -> Apr 30; leap year Feb 29; yearly Feb 29 -> Feb 28; weekly +7; daily +1
- discount: expired, inactive, below min_amount, usage limit reached -> not applied; fixed larger than subtotal capped
- lifecycle: valid transitions pass; `closed -> active` -> 409; pause/resume
- generate invoice: totals, items snapshot, next_billing_date advanced, period_end correct
- duplicate: second generate -> 409 DUPLICATE_BILLING; two concurrent generate calls -> exactly one invoice
- run-billing: skips paused/closed/not-due; idempotent on second run; one failing subscription does not block others
- payments: partial -> `partially_paid`; exact remainder -> `paid`; overpay 422; payment on draft invoice 409; cancel with payments 409
- RBAC: customer cannot POST payments/invoices/taxes/discounts (403); customer lists only own invoices; other customer's invoice -> 404
- dashboard: numbers match seeded data

## 3. Frontend integration tests (manual checklist + `npm run build`)
- `npm run build` passes with no errors (P3, P4 before every PR)
- Login stores token; refresh keeps session; wrong password shows error; 401 from API logs out
- Sidebar items by role: admin all; staff no Taxes/Discounts management actions; customer portal items only
- Direct URL to an unauthorised route redirects (e.g. customer -> `/taxes`)
- Products/Plans/Customers: create, edit, search, paginate, deactivate
- Subscription create form: validation, items editor, submits contract JSON (check browser Network tab: money fields are strings)
- Subscription detail shows only valid action buttons for the current status
- Invoice detail: totals match API; print preview (Ctrl+P) hides sidebar/buttons
- Error toasts for DUPLICATE_BILLING, OVERPAYMENT, INVALID_TRANSITION
- No console errors on any page; no request to a hard-coded URL; `VITE_USE_MOCKS` is `false` in the final run

## 4. Security checklist (Person 1 verifies before merging to main)
- [ ] No `.env`, secrets, `node_modules`, `.venv` committed (`git ls-files | Select-String ".env"`)
- [ ] Every router endpoint has `Depends(require_roles(...))` or `get_current_user`, except register/login/forgot/reset
- [ ] Customer queries filter by `customer_id` in SQL
- [ ] Passwords hashed (bcrypt); no password/hash in any response
- [ ] CORS only allows `FRONTEND_ORIGIN`
- [ ] JWT secret comes from env and is not the example value
- [ ] No float used for money

## 5. Bug triage during stabilisation (4:00–4:45)
Backend bug -> P2 (billing) or P1 (catalog/auth). UI bug -> owner of the page. Contract mismatch -> P1 decides, updates API_CONTRACT in a PR, both sides adapt. Anything found after 4:45 only if it breaks the demo scenario.
