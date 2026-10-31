# TEAM_TASKS — Non-overlapping work allocation

Read first (everyone): `docs/PROJECT_SPEC.md`, `docs/DATABASE_SCHEMA.md`, `docs/API_CONTRACT.md`, `docs/DEVELOPMENT_WORKFLOW.md`.
Branches: `backend-foundation` (P1), `backend-billing` (P2), `frontend-foundation` (P3), `frontend-billing` (P4). PRs go into `integration`.

## 0. Pre-wired shared files (created by P1 in the first commit, so nobody has to edit the same file)
| File | Owner | How others use it |
|---|---|---|
| `backend/app/main.py` | P1 | already includes `routers.billing_router` (P2) and the P1 routers via explicit imports of stub files |
| `backend/app/routers/billing_router.py` | P2 | stub `APIRouter(prefix="")` that P2 fills; includes sub-routers P2 creates in `routers/billing/*.py` |
| `backend/app/models/__init__.py` | P1 | already imports all 14 model modules so Alembic sees them |
| `backend/app/db/base.py`, `session.py`, `core/*` | P1 | P2 imports only |
| `backend/requirements.txt` | P1 | P2 adds extra packages to `backend/requirements-billing.txt` (P2-owned) |
| `frontend/src/App.jsx` | P3 | renders routes from `routes.jsx` and `billingRoutes.jsx` |
| `frontend/src/billingRoutes.jsx` | P4 | exports an array of route objects P4 fills; P3's App already spreads it into the layout |
| `frontend/src/components/layout/navItems.js` | P3 | has the P4 nav entries already (Subscriptions, Invoices, Payments, Taxes, Discounts, Quotations); roles-filtered |
| `frontend/src/api/client.js` | P3 | P4 imports `api` from it; never creates axios |

## PERSON 1 — Harsh: Backend foundation + Technical lead
**Branch:** `backend-foundation`
**Scope:** Backend skeleton; Postgres connection; `Base`; Alembic; ALL 14 SQLAlchemy models exactly per DATABASE_SCHEMA (P2's tables included, as the *initial* migration only); one `0001_initial_schema` migration; register/login/JWT/bcrypt; `get_current_user`, `require_roles`; error handler producing the contract error format and pagination helper; products, variants, plans, customers APIs; staff creation; admin seed; `.env` config; PR review; final testing.
**Dependencies:** none (starts immediately).
**Owns:** `backend/app/main.py`, `backend/app/core/**`, `backend/app/db/**`, `backend/app/models/{user,password_reset_token,product,product_variant,plan}.py`, `backend/app/models/__init__.py`, `backend/app/routers/{auth,products,variants,plans,customers}.py`, `backend/app/schemas/{auth,user,product,variant,plan,common}.py`, `backend/app/seed.py`, `backend/alembic/**`, `backend/requirements.txt`, `backend/.env.example`, root files, `docs/**`.
**Must not modify:** P2's models' *columns* after 0001 without the migration token; anything under `backend/app/services`, `routers/billing*`, `frontend/**`.
**Order:** (1) skeleton + config + db session + Base [15m] (2) models + Alembic 0001 [25m] (3) security/deps/auth endpoints [20m] -> **PR #1** (4) products/variants/plans [25m] (5) customers [10m] -> **PR #2** (6) seed, review PRs, integration testing.
**API deps:** none. **Deliverables:** running backend on :8000 with `/docs`, `alembic upgrade head` works, `python -m app.seed` creates `admin@brightloop.com` / `Admin@12345` (change via env), `pytest` for auth.
**Acceptance:** login works for seeded admin; customer cannot POST /products (403); register ignores role; `alembic heads` shows 1 head; every endpoint in contract sections 2–6 matches shapes.

### Claude planning prompt (P1)
```
You are my technical co-pilot for the Brightloop project (repo: Harsh-C-Hari/Subscription-Managment-System, branch backend-foundation). I am Person 1: backend foundation + tech lead. Read docs/PROJECT_SPEC.md, DATABASE_SCHEMA.md, API_CONTRACT.md, DEVELOPMENT_WORKFLOW.md and TEAM_TASKS.md. Give me a 90-minute step-by-step plan for my owned scope with exact file names, and a PR-review checklist I can use to verify the other three developers' PRs (ownership, contract compatibility, Decimal-only money, no secrets committed). Do not write code yet.
```
### Antigravity implementation prompt (P1)
```
ROLE: Backend foundation developer (Person 1) for Brightloop. Branch: backend-foundation. Do not switch branches.
FIRST: Inspect the repo tree (do not modify anything yet). Read docs/PROJECT_SPEC.md, docs/DATABASE_SCHEMA.md, docs/API_CONTRACT.md, docs/TEAM_TASKS.md in full.
BUILD (in order), inside backend/ only:
1. FastAPI app (app/main.py), settings from env (app/core/config.py, pydantic-settings), SQLAlchemy 2.x engine/session/Base (app/db/), CORS for FRONTEND_ORIGIN.
2. ALL 14 models exactly as in DATABASE_SCHEMA.md (UUID PKs, NUMERIC(12,2), CHECK/UNIQUE/partial unique index uq_invoice_sub_period, indexes). One file per model in app/models/, all imported in app/models/__init__.py.
3. Alembic configured to Base.metadata; generate ONE migration 0001_initial_schema; run alembic upgrade head against local PostgreSQL; confirm `alembic heads` shows one head.
4. Security: bcrypt hashing, JWT HS256 with expiry, get_current_user, require_roles(*roles), global exception handlers producing the {error:{code,message,details}} format, pagination helper returning {items,total,page,page_size,pages}.
5. Endpoints per API_CONTRACT sections 2-6 (auth, products, variants, plans, customers). Customers may only access their own record (404 for others). Money fields are Decimal in code and strings in JSON.
6. app/seed.py: idempotent admin seed from env ADMIN_EMAIL/ADMIN_PASSWORD.
7. Pre-wire app/routers/billing_router.py as an empty APIRouter and include it in main.py so Person 2 can fill it without editing main.py. Create empty stubs backend/app/services/__init__.py.
8. pytest tests for auth, role checks, products CRUD, customer isolation. Run them; fix failures.
RULES: Do not touch frontend/ or docs/ (except report). Do not create a second Base/engine. Never commit .env. Never use float for money. Follow the contract exactly; if the contract seems wrong, stop and note it in the report instead of changing it. Commit small meaningful commits (feat:, fix:, test:). Never force push; do not push to main.
FINISH: Push backend-foundation and give a completion report: endpoints done, tests run + results, known gaps, exact commands to start the server.
```

## PERSON 2 — Backend business logic
**Branch:** `backend-billing`
**Scope:** Subscription, invoice, payment, tax, discount, quotation-template logic and APIs; dashboard; billing run; duplicate prevention.
**Dependencies:** needs P1's PR #1 merged (models + auth deps) before integrating with DB. **Until then** (first ~45 min) write and unit-test pure services with no DB: `services/money.py` (quantize, Decimal helpers), `services/dates.py` (advance_date with anchor rule), `services/pricing.py` (calculate_invoice_totals, discount eligibility), `services/state_machine.py`.
**Owns:** `backend/app/services/**`, `backend/app/routers/billing_router.py`, `backend/app/routers/billing/**`, `backend/app/schemas/{subscription,invoice,payment,tax,discount,quotation,dashboard}.py`, `backend/app/models/{subscription,subscription_item,quotation_template,quotation_template_item,tax,discount,invoice,invoice_item,payment}.py` (logic/relationships only; columns changed only with the migration token), `backend/requirements-billing.txt`, `backend/tests/test_billing_*.py`.
**Must not modify:** `main.py`, `core/**`, `db/**`, P1's models, `alembic/versions/0001*`, `frontend/**`.
**Order:** (1) pure services + unit tests (2) after PR #1: subscription CRUD + lifecycle endpoints (3) invoice generate/confirm/cancel + run-billing (4) payments (5) taxes/discounts/templates (6) dashboard (7) integration tests of the demo flow.
**API deps:** `get_db`, `get_current_user`, `require_roles` from `app.core.deps`; `User`, `Product`, `ProductVariant`, `Plan` models.
**Deliverables:** contract sections 7–13 implemented; tests for money rounding, month-end advancement, duplicate billing, overpayment, discount limits.
**Acceptance:** generating twice for the same period returns 409 DUPLICATE_BILLING; bulk run is idempotent; payment totals flip invoice to partially_paid/paid; overpayment 422; customer sees only own invoices; dashboard numbers match DB.

### Claude planning prompt (P2)
```
I am Person 2 (backend business logic) on Brightloop, branch backend-billing. Read docs/PROJECT_SPEC.md (section 8 billing rules), DATABASE_SCHEMA.md, API_CONTRACT.md (sections 7-13) and TEAM_TASKS.md. Plan my work so I can start BEFORE Person 1's endpoints exist: list the pure-Python services and unit tests I can write first, then the exact order of endpoints once models are merged. Include edge cases: month-end anchor (31 -> Feb), yearly leap day, duplicate billing under concurrent requests, discount usage limit race, overpayment. No code yet.
```
### Antigravity implementation prompt (P2)
```
ROLE: Backend business-logic developer (Person 2) for Brightloop. Branch: backend-billing. Do not switch branches.
FIRST: Inspect the repo tree. Read docs/PROJECT_SPEC.md (esp. section 8), docs/DATABASE_SCHEMA.md, docs/API_CONTRACT.md, docs/TEAM_TASKS.md fully. Check whether Person 1's PR is merged (git fetch origin; git merge origin/integration). If models exist, use them; do NOT create another Base, engine or duplicate model.
STEP A (no DB needed): backend/app/services/money.py, dates.py, pricing.py, state_machine.py with Decimal ROUND_HALF_UP, anchor-day month/year advancement, invoice total calculation, discount eligibility, subscription/invoice state transitions. Write pytest unit tests and make them pass.
STEP B (after merging origin/integration): implement routers under backend/app/routers/billing/ and include them from backend/app/routers/billing_router.py (do NOT edit main.py): taxes, discounts, quotation-templates, subscriptions (+ lifecycle actions), invoices (generate, run-billing, confirm, cancel), payments, dashboard - exactly per API_CONTRACT.md sections 7-13, with Pydantic schemas in backend/app/schemas/.
KEY RULES: all money Decimal in code, string in JSON. Duplicate billing prevented by the partial unique index uq_invoice_sub_period AND a handled IntegrityError returning 409 DUPLICATE_BILLING. Invoice + items + discount usage increment + next_billing_date advance happen in one transaction per subscription; bulk run isolates failures per subscription. Payments lock the invoice row (with_for_update), reject overpayment (422 OVERPAYMENT), update amount_paid and status. Customers see only their own records (404 for others). Use require_roles from app.core.deps for every endpoint.
SCHEMA CHANGES: do not edit table columns or create Alembic migrations unless Person 1 has agreed ("migration token"). If a column is missing, stop and report.
TESTS: pytest including the full demo flow (create product/plan/customer -> subscription -> activate -> generate invoice -> pay -> dashboard) against a test database. Run them and fix errors.
RULES: Do not modify main.py, core/, db/, P1's models/routers, frontend/ or docs/. Commit small meaningful commits. Never force push; never push to main.
FINISH: push backend-billing and give a completion report: endpoints done, test results, gaps, how to run.
```

## PERSON 3 — Frontend foundation
**Branch:** `frontend-foundation`
**Scope:** Vite+React+Tailwind project, router, central axios client, AuthContext, shared layout (Sidebar/Header), shared UI kit, login/register, dashboard, products, plans, customers pages.
**Dependencies:** none for PR #1 (layout, client, auth context, UI kit). Pages use API_CONTRACT; test against P1's backend once PR #1 backend merges (use a quick mock via the contract meanwhile).
**Owns:** `frontend/**` EXCEPT `frontend/src/pages/billing/**`, `frontend/src/pages/portal/**`, `frontend/src/api/billing.js`, `frontend/src/billingRoutes.jsx` (P4's).
**Must not modify:** P4's files; `backend/**`; `docs/**`.
**Order:** (1) `npm create vite`, Tailwind, router, folders [20m] (2) `api/client.js` (baseURL from `VITE_API_BASE_URL`, attaches Bearer token, 401 -> logout), AuthContext, ProtectedRoute with role check [15m] (3) layout (Sidebar with role-based nav, Header with user + logout), UI kit: Button, Input, Select, Modal/Dialog, DataTable (with pagination), StatusBadge, Card, Spinner, EmptyState, Toast, formatMoney/formatDate helpers [25m] -> **PR #1 by 1:30** (4) Login/Register [15m] (5) Products (+variants), Plans, Customers pages [40m] (6) Dashboard with Recharts [20m] -> **PR #2** (7) polish, portal layout support.
**Shared exports P4 depends on (PR #1, exact names):** `src/api/client.js` default export `api`; `src/context/AuthContext.jsx` exports `AuthProvider`, `useAuth()` -> `{ user, token, login, logout, hasRole(...roles) }`; `src/components/layout/AppLayout.jsx`; `src/components/ui/index.js` exporting `Button, Input, Select, Modal, DataTable, StatusBadge, Card, Spinner, EmptyState, useToast, PageHeader`; `src/utils/format.js` exporting `formatMoney(str)`, `formatDate(str)`.
**Acceptance:** login as seeded admin; role-based sidebar; Products/Plans/Customers CRUD hit the real API; token persisted; 401 logs out; no hard-coded API URLs; `npm run build` passes.

### Claude planning prompt (P3)
```
I am Person 3 (frontend foundation) on Brightloop, branch frontend-foundation. Read docs/PROJECT_SPEC.md, API_CONTRACT.md and TEAM_TASKS.md. Plan my first 45 minutes so Person 4 can start using my layout, axios client, AuthContext and UI components ASAP (exact export names are in TEAM_TASKS). List components, props, and the order to build them. Also plan how to test pages before the backend is merged. No code yet.
```
### Antigravity implementation prompt (P3)
```
ROLE: Frontend foundation developer (Person 3) for Brightloop. Branch: frontend-foundation. Do not switch branches.
FIRST: Inspect the repo tree. Read docs/PROJECT_SPEC.md, docs/API_CONTRACT.md, docs/TEAM_TASKS.md fully.
BUILD inside frontend/: Vite + React (JavaScript) + Tailwind CSS + React Router + Axios + lucide-react + recharts.
1. src/api/client.js: ONE axios instance, baseURL import.meta.env.VITE_API_BASE_URL (default http://localhost:8000/api/v1), request interceptor adds Bearer token from localStorage, response interceptor clears auth and redirects to /login on 401. Export default api.
2. src/context/AuthContext.jsx: AuthProvider, useAuth() -> { user, token, login(email,password), logout(), hasRole(...roles), loading }, persists token, loads /auth/me on start.
3. src/components/layout/AppLayout.jsx (Sidebar with role-filtered navItems from navItems.js, Header, <Outlet/>). navItems.js MUST already contain entries for Person 4: Subscriptions, Invoices, Payments, Quotations, Taxes, Discounts (staff/admin) and My Subscriptions/My Invoices/My Payments (customer portal).
4. Shared UI in src/components/ui/ exporting via index.js: Button, Input, Select, Modal, DataTable (server pagination props: page,pageSize,total,onPageChange), StatusBadge (covers all subscription and invoice statuses), Card, Spinner, EmptyState, PageHeader, useToast. src/utils/format.js: formatMoney, formatDate (money values are STRINGS; never do float math on them).
5. Routing: src/App.jsx uses ProtectedRoute with allowed roles; import { billingRoutes } from './billingRoutes' (create it exporting an empty array) and spread it inside the protected layout so Person 4 only edits billingRoutes.jsx. Create placeholder pages/billing/ and pages/portal/ folders with .gitkeep only (Person 4 owns them).
6. Pages: Login, Register, Dashboard (GET /dashboard/summary + revenue-trend with Recharts; handle the endpoint not existing yet gracefully), Products (with variants dialog), Plans, Customers: full create/edit/deactivate with real API calls, loading/error/empty states, search and pagination per API_CONTRACT.
7. Commit and push a first PR-ready version of items 1-5 within ~45 minutes so Person 4 can build on it, then continue with 6.
RULES: Do not modify backend/, docs/, or anything under src/pages/billing, src/pages/portal, src/api/billing.js (Person 4's). Never hard-code API URLs. Do not invent API shapes. Run `npm run build` and fix errors. Commit small meaningful commits; never force push; never push to main.
FINISH: push frontend-foundation and give a completion report: pages done, exports available, build result, gaps.
```

## PERSON 4 — Frontend business interfaces
**Branch:** `frontend-billing`
**Scope:** Subscriptions (list/create/details/lifecycle actions), quotation interface and templates, invoices (list/details/print), payments (record/history), taxes UI, discounts UI, customer portal.
**Dependencies:** needs P3's PR #1 (layout, client, ui kit) merged. **Until then** (first ~40 min) write `src/api/billing.js` and page logic against API_CONTRACT, using a **mock adapter** (`src/api/mockBilling.js`, P4-owned) toggled by `VITE_USE_MOCKS=true`; delete/disable mocks when real endpoints land.
**Owns:** `frontend/src/pages/billing/**`, `frontend/src/pages/portal/**`, `frontend/src/api/billing.js`, `frontend/src/api/mockBilling.js`, `frontend/src/billingRoutes.jsx`, `frontend/src/components/billing/**` (P4-only components such as SubscriptionItemsEditor, InvoiceSummary, PaymentForm).
**Must not modify:** anything else in `frontend/src`, `backend/**`, `docs/**`. Never create another sidebar, layout, axios instance or Router.
**Order:** (1) api/billing.js + mock adapter (2) after PR #1: Subscriptions list + create form (customer/plan/tax/discount selectors using P1/P3 endpoints, items editor) (3) Subscription details + lifecycle buttons (confirm/activate/pause/resume/close/renew) (4) Invoices list + details + "Generate invoice" + "Run billing" + confirm/cancel + print stylesheet (5) Record payment dialog + payment history (6) Taxes + Discounts admin pages (7) Quotation templates + send quotation (8) Customer portal pages.
**Acceptance:** demo flow from the staff UI works end to end; admin-only pages hidden from staff/customer; customer sees only own data; money displayed via formatMoney; errors from API (e.g. DUPLICATE_BILLING, OVERPAYMENT) shown to the user in a toast/message.

### Claude planning prompt (P4)
```
I am Person 4 (frontend business interfaces) on Brightloop, branch frontend-billing. Read docs/API_CONTRACT.md (sections 7-14), docs/TEAM_TASKS.md and PROJECT_SPEC.md. Plan my work so I can start before Person 3 finishes: the api/billing.js wrapper functions, a mock adapter strictly following the contract's JSON shapes, and the page build order. List which shared components from Person 3 I must import (exact names in TEAM_TASKS) and how to handle API error codes in the UI. No code yet.
```
### Antigravity implementation prompt (P4)
```
ROLE: Frontend business-interface developer (Person 4) for Brightloop. Branch: frontend-billing. Do not switch branches.
FIRST: Inspect the repo tree. Read docs/PROJECT_SPEC.md, docs/API_CONTRACT.md (sections 7-14), docs/TEAM_TASKS.md fully. Run `git fetch origin; git merge origin/integration` to see whether Person 3's layout/client/UI kit exist. REUSE them: import api from src/api/client.js, useAuth from src/context/AuthContext.jsx, components from src/components/ui. NEVER create another axios instance, sidebar, layout, router or UI kit.
BUILD:
1. src/api/billing.js with one function per endpoint in the contract sections 7-13 (taxes, discounts, quotation-templates, subscriptions + actions, invoices, payments). If Person 3's client does not exist yet, write against `import api from './client'` and use src/api/mockBilling.js (JSON shapes copied from the contract) behind VITE_USE_MOCKS=true; remove reliance on mocks once the real backend is reachable.
2. Pages in src/pages/billing/: SubscriptionsList, SubscriptionCreate (customer, plan, tax, discount, items editor), SubscriptionDetail (status badge, items, lifecycle buttons shown only for valid transitions), InvoicesList (filters, overdue toggle, Run Billing button), InvoiceDetail (items, totals, payments, Confirm/Cancel/Record payment, print stylesheet for printing), PaymentsList, TaxesPage and DiscountsPage (admin only), QuotationTemplates (list/create/edit) and Send Quotation action.
3. Customer portal in src/pages/portal/: MyProfile, MySubscriptions, MyInvoices (+detail), MyPayments - read-only, uses the same endpoints (backend filters to own data).
4. Register all routes ONLY in src/billingRoutes.jsx (array of route objects with allowed roles); do not edit App.jsx or navItems.js (if a nav item is missing, report it).
5. Show API errors from the contract format {error:{code,message}} to the user (toast); handle DUPLICATE_BILLING, OVERPAYMENT, INVALID_TRANSITION, NOT_DUE explicitly with friendly messages. Display money only via formatMoney; never compute totals in the frontend.
RULES: Edit only files you own (see TEAM_TASKS). Real working screens, not static mockups. Run `npm run build` and fix errors. Commit small meaningful commits; never force push; never push to main.
FINISH: push frontend-billing and give a completion report: pages done, mock vs real API status, gaps, how to run.
```
