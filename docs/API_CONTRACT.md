# API_CONTRACT — Brightloop `/api/v1`

Frontend developers MUST NOT invent formats. Backend developers MUST NOT deviate. If something is missing, ask Person 1 and update this file via PR.

## 1. Conventions
- Base URL: `http://localhost:8000/api/v1`. JSON only. Field names are `snake_case`.
- Auth: `Authorization: Bearer <access_token>` on everything except `POST /auth/register` and `POST /auth/login`.
- IDs are UUID strings. Dates are `YYYY-MM-DD`. Timestamps are ISO-8601 UTC (`2026-10-31T09:30:00Z`).
- **Money is always a STRING with 2 decimals** (`"1180.00"`), in requests and responses. Never a JSON number. Frontend displays only; never calculates invoice totals.
- Enum values are lowercase snake_case exactly as in DATABASE_SCHEMA.

### Pagination (all list endpoints)
Query: `page` (default 1), `page_size` (default 20, max 100).
Response envelope:
```json
{ "items": [ ... ], "total": 57, "page": 1, "page_size": 20, "pages": 3 }
```
### Search / filter / sort
`search=<text>` (case-insensitive contains on the fields listed per endpoint), plus named filters per endpoint, `sort=<field>` or `sort=-<field>` (descending; default `-created_at`).

### Error format (every error)
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human readable", "details": [ { "field": "email", "message": "..." } ] } }
```
| HTTP | code | When |
|---|---|---|
| 400 | BAD_REQUEST | malformed input |
| 401 | UNAUTHORIZED | missing/invalid/expired token, bad login |
| 403 | FORBIDDEN | role not allowed / not your resource |
| 404 | NOT_FOUND | missing (also used for other customer's resource) |
| 409 | CONFLICT / INVALID_TRANSITION / DUPLICATE_BILLING | duplicates, bad state change |
| 422 | VALIDATION_ERROR / OVERPAYMENT | Pydantic or business validation |
| 500 | INTERNAL_ERROR | unexpected |

Permission legend: **A** admin, **S** staff, **C** customer (own data only), **Any** any authenticated.

## 2. Auth
| Method | Path | Perm | Notes |
|---|---|---|---|
| POST | /auth/register | public | creates **customer** only (role in body is ignored) |
| POST | /auth/login | public | returns token + user |
| GET | /auth/me | Any | current user |
| POST | /auth/staff | A | create a staff user |
| POST | /auth/forgot-password | public | P1 stub: always 200; in dev returns `reset_token` |
| POST | /auth/reset-password | public | P1 stub |

`POST /auth/register`
```json
{ "email": "ann@example.com", "password": "Secret123!", "full_name": "Ann Lee", "phone": "9876543210", "company_name": "Ann Co" }
```
201:
```json
{ "id": "uuid", "email": "ann@example.com", "full_name": "Ann Lee", "role": "customer", "is_active": true }
```
Errors: 409 CONFLICT (email exists), 422 (password < 8 chars).

`POST /auth/login` `{ "email": "...", "password": "..." }` ->
```json
{ "access_token": "eyJ...", "token_type": "bearer", "expires_in": 3600,
  "user": { "id": "uuid", "email": "admin@brightloop.com", "full_name": "Admin", "role": "admin" } }
```
Errors: 401 UNAUTHORIZED (wrong credentials or inactive).

`POST /auth/staff` (A) `{ "email","password","full_name","phone?" }` -> 201 user object with `role:"staff"`.

User object (used everywhere): `{ id, email, full_name, phone, company_name, address, role, is_active, created_at }`.

## 3. Products (P1)
| Method | Path | Perm |
|---|---|---|
| GET | /products | Any (customers see only `is_active=true`) — filters: `search` (name), `is_active` |
| POST | /products | A |
| GET | /products/{id} | Any |
| PUT | /products/{id} | A |
| DELETE | /products/{id} | A (soft: sets `is_active=false`, returns 204) |

Product: `{ id, name, description, base_price, is_active, created_at, variants?: [Variant] }` (`variants` only on GET by id).
`POST /products` `{ "name": "Brightloop CRM", "description": "...", "base_price": "999.00" }` -> 201 Product.
Errors: 409 duplicate name, 422 negative price.

## 4. Variants (P1)
| Method | Path | Perm |
|---|---|---|
| GET | /products/{product_id}/variants | Any |
| POST | /products/{product_id}/variants | A |
| PUT | /variants/{id} | A |
| DELETE | /variants/{id} | A (soft) |

Variant: `{ id, product_id, name, sku, price_adjustment, effective_price, is_active }`.
`POST` body: `{ "name": "Enterprise", "sku": "CRM-ENT", "price_adjustment": "500.00" }`.

## 5. Plans (P1)
| Method | Path | Perm |
|---|---|---|
| GET | /plans | Any (customers: active only) — filters: `search`, `billing_period`, `is_active`, `product_id` |
| POST | /plans | A |
| GET | /plans/{id} | Any |
| PUT | /plans/{id} | A |
| DELETE | /plans/{id} | A (soft) |

Plan: `{ id, name, description, billing_period, price, duration_periods, auto_close, product_id, is_active, created_at }`.
`POST /plans`
```json
{ "name": "CRM Monthly", "billing_period": "monthly", "price": "999.00", "duration_periods": 12, "auto_close": true, "product_id": "uuid" }
```

## 6. Customers (P1)
| Method | Path | Perm |
|---|---|---|
| GET | /customers | A, S — `search` (name/email/company), `is_active` |
| POST | /customers | A, S (creates a customer user; body like register; password optional -> server generates and returns `temporary_password` once) |
| GET | /customers/{id} | A, S; C only if id == self |
| PUT | /customers/{id} | A, S; C only self (cannot change role/is_active) |
| DELETE | /customers/{id} | A (deactivate: `is_active=false`, 204) |

Customer = User object with `role:"customer"`.

## 7. Taxes (P2)
| Method | Path | Perm |
|---|---|---|
| GET | /taxes | A, S — filter `is_active` |
| POST | /taxes | A |
| PUT | /taxes/{id} | A |
| DELETE | /taxes/{id} | A (soft) |
Tax: `{ id, name, rate, is_active }` — `rate` is a string like `"18.00"` (percent).

## 8. Discounts (P2)
| Method | Path | Perm |
|---|---|---|
| GET | /discounts | A, S — filters `is_active`, `search` (name/code) |
| POST | /discounts | A |
| PUT | /discounts/{id} | A |
| DELETE | /discounts/{id} | A (soft) |
Discount: `{ id, name, code, type, value, min_amount, valid_from, valid_until, usage_limit, used_count, is_active }`.
`POST` `{ "name":"Launch 10%", "code":"LAUNCH10", "type":"percentage", "value":"10.00", "min_amount":"0.00", "usage_limit":100 }`.

## 9. Quotation templates (P2)
| Method | Path | Perm |
|---|---|---|
| GET | /quotation-templates | A, S |
| POST | /quotation-templates | A, S |
| GET | /quotation-templates/{id} | A, S |
| PUT | /quotation-templates/{id} | A, S (replaces items list) |
| DELETE | /quotation-templates/{id} | A (soft) |
Template: `{ id, name, description, plan_id, validity_days, is_active, items: [ { id, product_id, variant_id, description, quantity, unit_price } ] }`.

## 10. Subscriptions (P2)
| Method | Path | Perm |
|---|---|---|
| GET | /subscriptions | A, S all; C only own — filters `status`, `customer_id`, `plan_id`, `search` (number / customer name) |
| POST | /subscriptions | A, S |
| GET | /subscriptions/{id} | A, S; C own |
| PUT | /subscriptions/{id} | A, S (only while `draft`/`quotation`) |
| POST | /subscriptions/{id}/send-quotation | A, S (`draft` -> `quotation`) |
| POST | /subscriptions/{id}/confirm | A, S (`draft|quotation` -> `confirmed`) |
| POST | /subscriptions/{id}/activate | A, S (`confirmed` -> `active`) |
| POST | /subscriptions/{id}/pause | A, S (`active` -> `paused`) |
| POST | /subscriptions/{id}/resume | A, S (`paused` -> `active`) |
| POST | /subscriptions/{id}/close | A, S (-> `closed`) |
| POST | /subscriptions/{id}/renew | A, S (closed/active -> creates a NEW draft subscription copy; returns it) |

`POST /subscriptions`
```json
{
  "customer_id": "uuid", "plan_id": "uuid", "template_id": null,
  "tax_id": "uuid-or-null", "discount_id": "uuid-or-null", "notes": "",
  "items": [ { "product_id": "uuid", "variant_id": null, "quantity": 2, "unit_price": "999.00" } ]
}
```
If `items` is omitted and `template_id` is given, items are copied from the template; if both omitted, one item is created from the plan price. `description` is filled by the server.
201 / GET response:
```json
{
  "id": "uuid", "subscription_number": "SUB-2026-000001", "status": "draft",
  "customer": { "id": "uuid", "full_name": "Ann Lee", "email": "ann@example.com" },
  "plan": { "id": "uuid", "name": "CRM Monthly", "billing_period": "monthly" },
  "tax": { "id": "uuid", "name": "GST", "rate": "18.00" },
  "discount": null,
  "items": [ { "id": "uuid", "product_id": "uuid", "variant_id": null, "description": "Brightloop CRM", "quantity": 2, "unit_price": "999.00", "line_total": "1998.00" } ],
  "start_date": null, "end_date": null, "next_billing_date": null,
  "created_at": "2026-10-31T09:30:00Z"
}
```
`POST /subscriptions/{id}/activate` optional body `{ "start_date": "2026-10-31" }` (default today). Sets `start_date`, `billing_anchor_day`, `next_billing_date = start_date`, `end_date` (from plan duration, else null).
Errors: 409 INVALID_TRANSITION; 404 for unknown/other-customer id; 422 unknown customer/plan.

## 11. Invoices (P2)
| Method | Path | Perm |
|---|---|---|
| GET | /invoices | A, S all; C own — filters `status`, `customer_id`, `subscription_id`, `overdue=true`, `from_date`, `to_date` (issue_date), `search` (number) |
| GET | /invoices/{id} | A, S; C own |
| POST | /invoices/generate | A, S — body `{ "subscription_id": "uuid" }` |
| POST | /invoices/run-billing | A, S — bulk, no body (or `{ "as_of_date": "2026-10-31" }`) |
| POST | /invoices/{id}/confirm | A, S (`draft` -> `confirmed`) |
| POST | /invoices/{id}/cancel | A, S (only `draft|confirmed` with no payments) |

Invoice:
```json
{
  "id": "uuid", "invoice_number": "INV-2026-000001", "status": "confirmed",
  "subscription_id": "uuid", "subscription_number": "SUB-2026-000001",
  "customer": { "id": "uuid", "full_name": "Ann Lee", "email": "ann@example.com" },
  "period_start": "2026-10-31", "period_end": "2026-11-29",
  "issue_date": "2026-10-31", "due_date": "2026-11-14",
  "items": [ { "id": "uuid", "description": "Brightloop CRM", "quantity": 2, "unit_price": "999.00", "line_total": "1998.00" } ],
  "subtotal": "1998.00", "discount_amount": "0.00", "tax_rate": "18.00", "tax_amount": "359.64",
  "total": "2357.64", "amount_paid": "0.00", "outstanding": "2357.64", "is_overdue": false,
  "payments": [ ]
}
```
`payments` is included only on `GET /invoices/{id}`.
`POST /invoices/generate` -> 201 Invoice (status `draft`). Errors: 409 `DUPLICATE_BILLING` (period already invoiced), 409 `INVALID_TRANSITION` (subscription not active), 409 `NOT_DUE` (`next_billing_date` is in the future).
`POST /invoices/run-billing` -> 200:
```json
{ "as_of_date": "2026-10-31", "created": 3, "skipped_duplicate": 1, "skipped_not_due": 0, "failed": 0,
  "invoices": [ { "subscription_id": "uuid", "invoice_id": "uuid", "invoice_number": "INV-2026-000002" } ],
  "errors": [ ] }
```
Print: frontend-only (browser print stylesheet on invoice detail page).

## 12. Payments (P2)
| Method | Path | Perm |
|---|---|---|
| POST | /invoices/{invoice_id}/payments | A, S |
| GET | /payments | A, S all; C own — filters `invoice_id`, `customer_id`, `method`, `from_date`, `to_date` |
| GET | /payments/{id} | A, S; C own |

`POST /invoices/{invoice_id}/payments`
```json
{ "amount": "1000.00", "method": "upi", "reference": "UPI-123", "paid_at": "2026-10-31T10:00:00Z", "notes": "" }
```
201:
```json
{ "payment": { "id": "uuid", "invoice_id": "uuid", "customer_id": "uuid", "amount": "1000.00", "method": "upi", "reference": "UPI-123", "paid_at": "2026-10-31T10:00:00Z" },
  "invoice": { "id": "uuid", "status": "partially_paid", "total": "2357.64", "amount_paid": "1000.00", "outstanding": "1357.64" } }
```
Errors: 422 `OVERPAYMENT`, 409 `INVALID_TRANSITION` (invoice is draft/cancelled/paid), 422 amount <= 0.

## 13. Dashboard (P2) — A, S
`GET /dashboard/summary` ->
```json
{ "total_revenue": "1000.00", "outstanding_amount": "1357.64", "overdue_amount": "0.00", "overdue_invoice_count": 0,
  "active_subscriptions": 4, "total_customers": 12, "invoices_by_status": { "draft": 1, "confirmed": 2, "partially_paid": 1, "paid": 5, "cancelled": 0 },
  "subscriptions_by_status": { "draft": 1, "quotation": 0, "confirmed": 1, "active": 4, "paused": 0, "closed": 2 } }
```
`total_revenue` = sum of all payments. `outstanding_amount` = sum(total - amount_paid) over `confirmed|partially_paid` invoices. Overdue = same set with `due_date < today`.
`GET /dashboard/revenue-trend?months=6` -> `{ "points": [ { "month": "2026-10", "revenue": "1000.00" } ] }`.

## 14. Customer portal (P2 serves, P4 consumes)
Customers use the same endpoints (`/subscriptions`, `/invoices`, `/payments`, `/auth/me`, `/customers/{self}`); the backend filters by `customer_id = current_user.id`. A customer requesting another customer's record gets **404**.

## 15. Status code summary
POST create = 201; POST action = 200; DELETE = 204; GET/PUT = 200.
