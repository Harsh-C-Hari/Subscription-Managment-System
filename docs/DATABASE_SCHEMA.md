# DATABASE_SCHEMA — Brightloop

PostgreSQL 15+. All PKs are `UUID` (default `gen_random_uuid()` in DB; in SQLAlchemy use `default=uuid.uuid4`). All timestamps are `TIMESTAMPTZ` (`created_at` default `now()`). Money is `NUMERIC(12,2)`; rates/percentages are `NUMERIC(5,2)`.

Shared setup (owner **P1**): `backend/app/db/base.py` defines `Base = DeclarativeBase`. `backend/app/db/session.py` defines the engine, `SessionLocal`, `get_db`. **P2 imports these; never creates another Base/engine.**

## Enums (stored as VARCHAR + CHECK, not native PG enums, so migrations stay simple)
| Name | Values |
|---|---|
| user_role | `admin`, `staff`, `customer` |
| billing_period | `daily`, `weekly`, `monthly`, `yearly` |
| subscription_status | `draft`, `quotation`, `confirmed`, `active`, `paused`, `closed` |
| invoice_status | `draft`, `confirmed`, `partially_paid`, `paid`, `cancelled` |
| discount_type | `fixed`, `percentage` |
| payment_method | `cash`, `card`, `bank_transfer`, `upi`, `other` |

## Ownership summary
| Table | Model | Owner |
|---|---|---|
| users | User | P1 |
| password_reset_tokens | PasswordResetToken | P1 |
| products | Product | P1 |
| product_variants | ProductVariant | P1 |
| plans | Plan | P1 |
| subscriptions | Subscription | P2 |
| subscription_items | SubscriptionItem | P2 |
| quotation_templates | QuotationTemplate | P2 |
| quotation_template_items | QuotationTemplateItem | P2 |
| taxes | Tax | P2 |
| discounts | Discount | P2 |
| invoices | Invoice | P2 |
| invoice_items | InvoiceItem | P2 |
| payments | Payment | P2 |

## P1 tables

### users
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | NOT NULL, UNIQUE (stored lowercase) |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | VARCHAR(150) | NOT NULL |
| phone | VARCHAR(30) | NULL |
| company_name | VARCHAR(150) | NULL |
| address | TEXT | NULL |
| role | VARCHAR(20) | NOT NULL, CHECK role IN (...), default `customer` |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | NOT NULL |
Indexes: `ix_users_role`, unique on `email`.
Customers = `users` where `role='customer'`. There is no separate customers table.

### password_reset_tokens
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users.id ON DELETE CASCADE, NOT NULL |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | TIMESTAMPTZ | NOT NULL |
| used_at | TIMESTAMPTZ | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
Index: `ix_prt_user_id`.

### products
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| base_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | |
Index: `ix_products_is_active`.

### product_variants
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK products.id ON DELETE CASCADE, NOT NULL |
| name | VARCHAR(150) | NOT NULL |
| sku | VARCHAR(60) | NULL, UNIQUE |
| price_adjustment | NUMERIC(12,2) | NOT NULL default 0 (added to product base_price) |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | |
Constraint: `UNIQUE (product_id, name)`. Index: `ix_variants_product_id`.
Effective variant price = `products.base_price + price_adjustment`.

### plans
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| billing_period | VARCHAR(10) | NOT NULL, CHECK in billing_period |
| price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 (price per billing period) |
| duration_periods | INTEGER | NULL, CHECK > 0 (number of billing periods; NULL = open-ended) |
| auto_close | BOOLEAN | NOT NULL default true (close subscription when duration is finished) |
| product_id | UUID | FK products.id ON DELETE SET NULL, NULL |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | |
Indexes: `ix_plans_product_id`, `ix_plans_is_active`.

## P2 tables

### taxes
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| rate | NUMERIC(5,2) | NOT NULL, CHECK rate >= 0 AND rate <= 100 |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | |

### discounts
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | NOT NULL |
| code | VARCHAR(40) | NOT NULL, UNIQUE (stored uppercase) |
| type | VARCHAR(12) | NOT NULL, CHECK in discount_type |
| value | NUMERIC(12,2) | NOT NULL, CHECK > 0; for percentage CHECK <= 100 |
| min_amount | NUMERIC(12,2) | NOT NULL default 0 |
| valid_from | DATE | NULL |
| valid_until | DATE | NULL, CHECK valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from |
| usage_limit | INTEGER | NULL, CHECK > 0 |
| used_count | INTEGER | NOT NULL default 0, CHECK >= 0 |
| is_active | BOOLEAN | NOT NULL default true |
| created_at / updated_at | TIMESTAMPTZ | |
Table-level CHECK: `usage_limit IS NULL OR used_count <= usage_limit`.

### quotation_templates
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(150) | NOT NULL, UNIQUE |
| description | TEXT | NULL |
| plan_id | UUID | FK plans.id ON DELETE SET NULL, NULL |
| validity_days | INTEGER | NOT NULL default 30, CHECK > 0 |
| is_active | BOOLEAN | NOT NULL default true |
| created_by | UUID | FK users.id ON DELETE SET NULL, NULL |
| created_at / updated_at | TIMESTAMPTZ | |

### quotation_template_items
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| template_id | UUID | FK quotation_templates.id ON DELETE CASCADE, NOT NULL |
| product_id | UUID | FK products.id ON DELETE RESTRICT, NOT NULL |
| variant_id | UUID | FK product_variants.id ON DELETE RESTRICT, NULL |
| description | VARCHAR(255) | NULL |
| quantity | INTEGER | NOT NULL, CHECK > 0 |
| unit_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
Index: `ix_qti_template_id`.

### subscriptions
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| subscription_number | VARCHAR(30) | NOT NULL, UNIQUE (format `SUB-YYYY-NNNNNN`) |
| customer_id | UUID | FK users.id ON DELETE RESTRICT, NOT NULL |
| plan_id | UUID | FK plans.id ON DELETE RESTRICT, NOT NULL |
| template_id | UUID | FK quotation_templates.id ON DELETE SET NULL, NULL |
| tax_id | UUID | FK taxes.id ON DELETE SET NULL, NULL |
| discount_id | UUID | FK discounts.id ON DELETE SET NULL, NULL |
| status | VARCHAR(15) | NOT NULL default `draft`, CHECK in subscription_status |
| start_date | DATE | NULL (set on activation) |
| end_date | DATE | NULL (computed from plan.duration_periods on activation) |
| next_billing_date | DATE | NULL (set on activation = start_date) |
| billing_anchor_day | SMALLINT | NULL, CHECK 1..31 (day of start_date) |
| quotation_sent_at | TIMESTAMPTZ | NULL |
| confirmed_at / activated_at / closed_at | TIMESTAMPTZ | NULL |
| notes | TEXT | NULL |
| created_by | UUID | FK users.id ON DELETE SET NULL, NULL |
| created_at / updated_at | TIMESTAMPTZ | |
Indexes: `ix_sub_customer_id`, `ix_sub_status`, **`ix_sub_billing_due (status, next_billing_date)`** (used by billing run), `ix_sub_plan_id`.
Constraint: `CHECK (status <> 'active' OR (start_date IS NOT NULL AND next_billing_date IS NOT NULL))`.

### subscription_items
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| subscription_id | UUID | FK subscriptions.id ON DELETE CASCADE, NOT NULL |
| product_id | UUID | FK products.id ON DELETE RESTRICT, NOT NULL |
| variant_id | UUID | FK product_variants.id ON DELETE RESTRICT, NULL |
| description | VARCHAR(255) | NOT NULL (snapshot of product/variant name) |
| quantity | INTEGER | NOT NULL, CHECK > 0 |
| unit_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 (price per billing period, snapshot) |
Index: `ix_si_subscription_id`.

### invoices
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| invoice_number | VARCHAR(30) | NOT NULL, UNIQUE (`INV-YYYY-NNNNNN`) |
| subscription_id | UUID | FK subscriptions.id ON DELETE RESTRICT, NOT NULL |
| customer_id | UUID | FK users.id ON DELETE RESTRICT, NOT NULL (denormalised for fast portal filtering) |
| status | VARCHAR(15) | NOT NULL default `draft`, CHECK in invoice_status |
| period_start | DATE | NOT NULL |
| period_end | DATE | NOT NULL, CHECK period_end >= period_start |
| issue_date | DATE | NOT NULL default today |
| due_date | DATE | NOT NULL, CHECK due_date >= issue_date (default issue_date + 14 days) |
| subtotal | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| discount_id | UUID | FK discounts.id ON DELETE SET NULL, NULL |
| discount_amount | NUMERIC(12,2) | NOT NULL default 0, CHECK >= 0 |
| tax_id | UUID | FK taxes.id ON DELETE SET NULL, NULL |
| tax_rate | NUMERIC(5,2) | NOT NULL default 0 (snapshot) |
| tax_amount | NUMERIC(12,2) | NOT NULL default 0 |
| total | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| amount_paid | NUMERIC(12,2) | NOT NULL default 0, CHECK >= 0 AND amount_paid <= total |
| confirmed_at / paid_at / cancelled_at | TIMESTAMPTZ | NULL |
| created_at / updated_at | TIMESTAMPTZ | |
**Duplicate-billing constraint:**
```sql
CREATE UNIQUE INDEX uq_invoice_sub_period
  ON invoices (subscription_id, period_start)
  WHERE status <> 'cancelled';
```
Also `CHECK (subtotal - discount_amount + tax_amount = total)`.
Other indexes: `ix_inv_customer_id`, `ix_inv_status`, `ix_inv_due_date`, `ix_inv_subscription_id`.
`outstanding = total - amount_paid` is computed in the API (not stored).
In SQLAlchemy declare the partial unique index with `Index("uq_invoice_sub_period", "subscription_id", "period_start", unique=True, postgresql_where=text("status <> 'cancelled'"))`.

### invoice_items
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| invoice_id | UUID | FK invoices.id ON DELETE CASCADE, NOT NULL |
| product_id | UUID | FK products.id ON DELETE SET NULL, NULL |
| variant_id | UUID | FK product_variants.id ON DELETE SET NULL, NULL |
| description | VARCHAR(255) | NOT NULL |
| quantity | INTEGER | NOT NULL, CHECK > 0 |
| unit_price | NUMERIC(12,2) | NOT NULL, CHECK >= 0 |
| line_total | NUMERIC(12,2) | NOT NULL, CHECK line_total = quantity * unit_price |
Index: `ix_ii_invoice_id`.

### payments
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| invoice_id | UUID | FK invoices.id ON DELETE RESTRICT, NOT NULL |
| customer_id | UUID | FK users.id ON DELETE RESTRICT, NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL, CHECK > 0 |
| method | VARCHAR(20) | NOT NULL, CHECK in payment_method |
| reference | VARCHAR(100) | NULL |
| paid_at | TIMESTAMPTZ | NOT NULL default now() |
| recorded_by | UUID | FK users.id ON DELETE SET NULL, NULL |
| notes | TEXT | NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
Indexes: `ix_pay_invoice_id`, `ix_pay_customer_id`, `ix_pay_paid_at`.

## Relationships (SQLAlchemy `relationship`)
- User 1—* Subscription (as customer), User 1—* Invoice, User 1—* Payment.
- Product 1—* ProductVariant; Product 1—* Plan (optional).
- Plan 1—* Subscription.
- Subscription 1—* SubscriptionItem; Subscription 1—* Invoice.
- Invoice 1—* InvoiceItem; Invoice 1—* Payment.
- QuotationTemplate 1—* QuotationTemplateItem; QuotationTemplate 1—* Subscription (optional).
- Tax 1—* Subscription/Invoice; Discount 1—* Subscription/Invoice.
Cross-owner relationships (P2 models pointing at P1 models) are declared **on the P2 side only** using string class names and `ForeignKey("users.id")`. P2 must NOT edit P1 model files to add back-references.

## Migration procedure (single head, no competing migrations)
1. **P1** creates ALL 14 model files (P2's 9 tables as the exact columns above) as part of the foundation, generates **one** initial migration `0001_initial_schema` and pushes it to `backend-foundation`, then merges to `integration` in the first PR (target: 1:00 PM).
   - Reason: if P1 builds the whole schema from this document at once, there is exactly one initial head and P2 does not need to wait for P1 endpoints.
   - P2 then replaces the placeholder model files with the real logic-bearing versions (adding methods/relationships only; **table/column changes require a migration, see step 3**).
2. **P2** starts from `integration` after that PR merges. Until then P2 writes services and schemas against the spec in this document.
3. Schema changes after 0001: only **one backend developer holds the "migration token"** at a time. Ask in the team chat: "taking migration token". Steps: `git fetch origin` -> `git merge origin/integration` -> `alembic heads` (must show ONE head) -> `alembic revision --autogenerate -m "short_name"` -> review -> `alembic upgrade head` -> commit -> push -> PR to integration -> merged within 15 minutes -> announce "migration token released". The other developer then merges integration BEFORE touching any model.
4. If `alembic heads` ever shows 2 heads: stop, do not run `alembic merge` yourself, tell Person 1.
5. Never edit an already-merged migration file. Never delete one.
