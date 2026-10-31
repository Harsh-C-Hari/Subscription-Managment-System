# Brightloop Subscription Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0+-D71F00.svg)](https://www.sqlalchemy.org)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, multi-tenant subscription and recurring billing platform engineered with **FastAPI**, **SQLAlchemy 2.0**, **PostgreSQL**, and **React (Vite)**. Brightloop provides full-lifecycle subscription management, automated invoicing, atomic discount validation, payment tracking, real-time analytics, and a self-service customer portal.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development Setup](#local-development-setup)
  - [1. Database Setup](#1-database-setup)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Production Deployment Guide](#production-deployment-guide)
  - [Production Backend Execution](#production-backend-execution)
  - [Production Frontend Bundle](#production-frontend-bundle)
  - [Nginx Reverse Proxy Configuration](#nginx-reverse-proxy-configuration)
  - [Docker & Containerized Setup](#docker--containerized-setup)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [API Reference](#api-reference)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Troubleshooting & Gotchas](#troubleshooting--gotchas)
- [License](#license)

---

## System Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Devices"]
        BrowserAdmin["Admin / Staff Operator"]
        BrowserCustomer["Customer Portal User"]
    end

    subgraph FrontendApp ["Frontend Application (Vite + React 19)"]
        Router["React Router v7"]
        AuthCtx["Auth Context & Token Storage"]
        UI["Tailwind Industrial Theme & Recharts"]
        ApiClient["Axios Client (Bearer JWT Interceptor)"]
    end

    subgraph BackendAPI ["Backend Service (FastAPI ASGI)"]
        CORS["CORS & Error Envelopes"]
        AuthMiddleware["JWT HS256 Role-Based Guards"]
        Routers["Routers (/api/v1)"]
        Services["Business Services (Billing, Pricing, State Machines)"]
        ORM["SQLAlchemy 2.0 Base & Models"]
    end

    subgraph Storage ["Persistent Storage"]
        PG[(PostgreSQL 16 Engine)]
        Alembic["Alembic Migrations"]
    end

    BrowserAdmin --> Router
    BrowserCustomer --> Router
    Router --> UI
    UI --> AuthCtx
    UI --> ApiClient
    ApiClient -->|REST API Requests| CORS
    CORS --> AuthMiddleware
    AuthMiddleware --> Routers
    Routers --> Services
    Services --> ORM
    ORM --> PG
    Alembic -.->|Applies Schema| PG
```

### Core Architecture & Invariants

1. **Strict Monetary Arithmetic**:
   - Zero floating-point representation in financial calculations.
   - Database stores currency using `NUMERIC(12,2)`.
   - Python code operates exclusively on `Decimal` with `ROUND_HALF_UP` via `app.services.money.quantize`.
   - JSON payloads serialize all currency values as formatted 2-decimal strings (e.g., `"1499.00"`).

2. **Deterministic State Machines**:
   - **Subscription**: `draft` $\rightarrow$ `quotation` $\rightarrow$ `confirmed` $\rightarrow$ `active` $\rightleftharpoons$ `paused` $\rightarrow$ `closed`. Active/closed subscriptions renew by instantiating an immutable draft copy.
   - **Invoice**: `draft` $\rightarrow$ `confirmed` $\rightarrow$ `partially_paid` $\rightarrow$ `paid` (or `cancelled` if zero recorded payments).
   - **Payment**: Atomic transition modifying invoice `amount_paid` and `outstanding`. Rejects any overpayment with `422 OVERPAYMENT`.

3. **Tenant & Data Isolation**:
   - Customers only query their own subscriptions, invoices, and payments.
   - Any attempt by a customer to query another customer's ID returns **404 NOT_FOUND** (not 403), eliminating resource enumeration risks.

4. **Duplicate Billing Protection**:
   - Partial unique PostgreSQL index `uq_invoice_sub_period` on `(subscription_id, period_start) WHERE status <> 'cancelled'` guarantees single-invoice generation per period even under concurrent billing runs.

---

## Key Features

- **Product & Plan Catalog**:
  - Multi-tier product definitions with variant adjustments and SKUs.
  - Granular billing intervals (monthly, quarterly, annual, custom intervals).
  - Configurable duration periods and automated subscription closure.

- **Automated Billing Engine**:
  - Calendar-aware period generation with billing anchor days.
  - Automated recurring invoice generation and bulk batch billing (`POST /api/v1/invoices/run-billing`).
  - Invoice sequence generation format: `INV-YYYY-NNNNNN`.
  - Atomic discount usage decrement (`used_count < usage_limit`) preventing race conditions.

- **Payment Recording & Ledger**:
  - Multi-payment support per invoice (UPI, Card, Bank Transfer, Cash).
  - Automated status updates (`partially_paid`, `paid`).
  - Strict overpayment guards and receipt audit tracking.

- **Real-Time Telemetry Dashboard**:
  - Gross revenue, pending receivables, and overdue invoice metrics.
  - 6-month historical revenue trends via Recharts.
  - Subscription breakdown by lifecycle state.

- **Customer Self-Service Portal**:
  - Customer terminal for reviewing active services, renewal dates, and payment history.
  - Printable, itemized invoice statements with tax and discount breakdowns.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) 0.110+, [Uvicorn](https://www.uvicorn.org/) 0.28+ |
| **ORM & Migrations** | [SQLAlchemy](https://www.sqlalchemy.org/) 2.0+, [Alembic](https://alembic.sqlalchemy.org/) 1.13+ |
| **Database** | [PostgreSQL](https://www.postgresql.org/) 16+ via `psycopg2-binary` |
| **Security & Auth** | JWT (`python-jose` HS256), Password Hashing (`passlib` + `bcrypt==4.0.1`) |
| **Validation** | [Pydantic](https://docs.pydantic.dev/) v2, [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) |
| **Frontend Framework** | [React](https://react.dev/) 19, [Vite](https://vitejs.dev/) 8.3+ |
| **Styling & UI Kit** | [Tailwind CSS](https://tailwindcss.com/) 3.4+, [Lucide React](https://lucide.dev/), Industrial Theme Primitives |
| **Data Visualization** | [Recharts](https://recharts.org/) 3.10+ |
| **HTTP Client** | [Axios](https://axios-http.com/) 1.21+ |
| **Testing** | [pytest](https://docs.pytest.org/) 8.1+, `pytest-asyncio`, `httpx` |

---

## Repository Structure

```text
subscription-management-system/
├── backend/
│   ├── alembic/                      # Database migrations
│   │   └── versions/                 # Revision versions (0001_initial_schema)
│   ├── app/
│   │   ├── core/                     # Configuration, dependencies, security
│   │   ├── db/                       # SQLAlchemy engine, session, Base
│   │   ├── models/                   # 14 SQLAlchemy ORM models
│   │   ├── routers/                  # API route controllers
│   │   │   ├── auth.py               # Authentication & staff registration
│   │   │   ├── products.py           # Catalog products
│   │   │   ├── variants.py           # Product variants
│   │   │   ├── plans.py              # Subscription plans
│   │   │   ├── customers.py          # Customer directories
│   │   │   └── billing/              # Taxes, discounts, quotations, subs, invoices, payments, dashboard
│   │   ├── schemas/                  # Pydantic v2 validation DTOs
│   │   ├── services/                 # Billing logic, pricing calculations, date math, state machine
│   │   ├── main.py                   # FastAPI initialization & global exception handlers
│   │   └── seed.py                   # Initial admin & catalog seed script
│   ├── tests/                        # 150+ unit and integration tests
│   ├── alembic.ini                   # Alembic configuration
│   └── requirements.txt              # Production Python dependencies
├── frontend/
│   ├── public/                       # Static public assets & icons
│   ├── src/
│   │   ├── api/                      # Axios client & billing endpoint connectors
│   │   ├── components/               # UI primitives (Buttons, Modals, Tables, Layout)
│   │   ├── context/                  # AuthContext & Session management
│   │   ├── pages/                    # Auth, Catalog, Billing, Dashboard, and Customer Portal pages
│   │   ├── utils/                    # Monetary formatters & date helpers
│   │   ├── App.jsx                   # Route registration chassis
│   │   ├── billingRoutes.jsx         # Billing routes registry
│   │   └── main.jsx                  # Application entry point
│   ├── package.json                  # Frontend dependencies
│   ├── tailwind.config.js            # Tailwind industrial theme configuration
│   └── vite.config.js                # Vite build configuration
├── docs/                             # Architecture specifications & API contracts
└── README.md                         # Production documentation
```

---

## Prerequisites

Ensure the following runtimes and services are available:

- **Python**: `3.10` or higher (`python --version`)
- **Node.js**: `18.x` or higher (`node --version`)
- **Package Manager**: `npm` 9+ or `pnpm`
- **PostgreSQL**: `15.x` or `16.x` server running locally or accessible via network

---

## Environment Configuration

### Backend Configuration (`backend/.env`)

Copy the template from `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

| Variable | Type | Default / Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | String | `postgresql+psycopg2://postgres:pass@localhost:5432/brightloop` | Primary PostgreSQL connection string |
| `TEST_DATABASE_URL` | String | `postgresql+psycopg2://postgres:pass@localhost:5432/brightloop_test` | Test database used by pytest |
| `JWT_SECRET_KEY` | String | *Generated secret (48+ chars)* | HMAC-SHA256 signature key for JWT tokens |
| `JWT_ALGORITHM` | String | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Integer | `60` | Token validity duration |
| `FRONTEND_ORIGIN` | String | `http://localhost:5173` | Allowed CORS origin for browser access |
| `ADMIN_EMAIL` | String | `admin@brightloop.com` | Default admin email populated by seed script |
| `ADMIN_PASSWORD` | String | `Admin@12345` | Default admin password populated by seed script |
| `ADMIN_FULL_NAME` | String | `Brightloop Admin` | Display name for system administrator |
| `APP_ENV` | String | `production` (or `development`) | Environment flag (`development` prints reset tokens) |

*Generate a secure JWT secret key:*
```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Frontend Configuration (`frontend/.env`)

Copy the template from `frontend/.env.example`:

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | String | `http://localhost:8000/api/v1` | Base URL pointing to the FastAPI backend |
| `VITE_USE_MOCKS` | Boolean | `false` | When `false`, all UI operations hit the live backend |

---

## Local Development Setup

### 1. Database Setup

Using `psql` or your database administrator tool, create the application and testing databases:

```sql
CREATE DATABASE brightloop;
CREATE DATABASE brightloop_test;
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial admin account
python -m app.seed

# Start the development ASGI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API documentation will be available at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 3. Frontend Setup

In a separate terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

The web application will be accessible at:
- Web App: [http://localhost:5173](http://localhost:5173)

### Default Administrator Credentials

- **Email**: `admin@brightloop.com`
- **Password**: `Admin@12345` (or value configured in `ADMIN_PASSWORD`)

---

## Production Deployment Guide

### Production Backend Execution

In production, run Uvicorn with multiple workers or through Gunicorn as the process manager:

```bash
cd backend
source .venv/bin/activate

# Multi-worker Uvicorn deployment (adjust workers based on CPU count)
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --proxy-headers \
  --forwarded-allow-ips='*'
```

Alternatively, use Gunicorn with the Uvicorn worker class:

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### Production Frontend Bundle

Build the optimized static assets:

```bash
cd frontend
npm run build
```

This generates production-ready, minified static assets in `frontend/dist/`. Serve these files using Nginx, Cloudflare Pages, AWS S3/CloudFront, or any static file server.

### Nginx Reverse Proxy Configuration

Below is a production Nginx configuration snippet routing API requests to FastAPI and serving the frontend SPA:

```nginx
server {
    listen 80;
    server_name billing.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name billing.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/billing.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/billing.yourdomain.com/privkey.pem;

    # Frontend Single Page Application
    location / {
        root /var/www/brightloop/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Reverse Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # API Documentation in production (optional: restrict by IP)
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker & Containerized Setup

A standard two-container deployment using `docker-compose`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: brightloop_db
    environment:
      POSTGRES_DB: brightloop
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: supersecretpassword
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: brightloop_api
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql+psycopg2://postgres:supersecretpassword@postgres:5432/brightloop
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      FRONTEND_ORIGIN: https://billing.yourdomain.com
      APP_ENV: production
    ports:
      - "8000:8000"
    restart: unless-stopped

volumes:
  pgdata:
```

---

## Role-Based Access Control (RBAC)

The system enforces granular role-based permissions across three roles:

| Module / Operation | Path | Admin | Staff | Customer |
|---|---|:---:|:---:|:---:|
| **Authentication & Profile** | `/auth/me`, `/auth/change-password` | Read / Update | Read / Update | Read / Update |
| **Create Staff Members** | `POST /auth/staff` | Full Access | Denied (403) | Denied (403) |
| **Product & Plan Catalog** | `/products`, `/variants`, `/plans` | Full CRUD | Read Only | Denied (403) |
| **Customers Directory** | `/customers` | Full CRUD | Full CRUD | Denied (403) |
| **Taxes & Discounts** | `/taxes`, `/discounts` | Full CRUD | Read Only | Denied (403) |
| **Quotation Templates** | `/quotation-templates` | Full CRUD | Full CRUD | Denied (403) |
| **Subscriptions (Internal)**| `/subscriptions` | Full Access | Full Access | Own Records Only |
| **Lifecycle Actions** | `/subscriptions/{id}/[confirm\|activate\|pause\|resume\|close\|renew]` | Full Access | Full Access | Denied (403) |
| **Invoicing & Billing Runs**| `/invoices`, `/invoices/generate`, `/invoices/run-billing` | Full Access | Full Access | Own Invoices (Read Only) |
| **Payments Processing** | `/invoices/{id}/payments`, `GET /payments` | Full Access | Full Access | Own Payments (Read Only) |
| **Telemetry Dashboard** | `/dashboard/summary`, `/dashboard/revenue-trend` | Full Access | Full Access | Denied (403) |
| **Customer Portal** | `/portal` (routes) | Denied | Denied | Full Access |

---

## API Reference

All API routes are prefixed under `/api/v1`. Detailed interactive documentation is available at `/docs`.

### Authentication & User Management
- `POST /api/v1/auth/register` — Public customer registration (forces `customer` role)
- `POST /api/v1/auth/login` — Authenticate and receive Bearer JWT token
- `GET /api/v1/auth/me` — Retrieve active authenticated user profile
- `POST /api/v1/auth/staff` — Admin-only endpoint to provision staff or admin accounts
- `POST /api/v1/auth/forgot-password` — Issue password reset request
- `POST /api/v1/auth/reset-password` — Complete password reset via verification token

### Products, Variants & Plans
- `GET, POST /api/v1/products` — List and create catalog products
- `GET, PUT, DELETE /api/v1/products/{id}` — Manage specific product (soft delete)
- `POST /api/v1/products/{id}/variants` — Add product variant with price adjustment
- `GET, POST /api/v1/plans` — List and create recurring subscription plans
- `GET, PUT, DELETE /api/v1/plans/{id}` — Manage plan specifications

### Billing, Subscriptions & Invoices
- `GET, POST, PUT, DELETE /api/v1/taxes` — Manage tax rates (percentage)
- `GET, POST, PUT, DELETE /api/v1/discounts` — Manage promotional discount codes
- `GET, POST, PUT, DELETE /api/v1/quotation-templates` — Manage standardized quotation templates
- `GET, POST, PUT /api/v1/subscriptions` — List, create, and modify subscriptions
- `POST /api/v1/subscriptions/{id}/send-quotation` — Transition draft $\rightarrow$ quotation
- `POST /api/v1/subscriptions/{id}/confirm` — Confirm quotation
- `POST /api/v1/subscriptions/{id}/activate` — Activate subscription and set billing anchor
- `POST /api/v1/subscriptions/{id}/pause` — Temporarily halt billing cycle
- `POST /api/v1/subscriptions/{id}/resume` — Resume active billing
- `POST /api/v1/subscriptions/{id}/close` — Terminate subscription
- `POST /api/v1/subscriptions/{id}/renew` — Spawn a renewed draft subscription
- `GET /api/v1/invoices` — List invoices (filterable by status, customer, overdue status)
- `POST /api/v1/invoices/generate` — Generate single invoice for due subscription
- `POST /api/v1/invoices/run-billing` — Execute batch billing run for all due subscriptions
- `POST /api/v1/invoices/{id}/confirm` — Finalize draft invoice
- `POST /api/v1/invoices/{id}/cancel` — Void unpaid invoice

### Payments & Dashboard
- `POST /api/v1/invoices/{id}/payments` — Record payment against confirmed/partially paid invoice
- `GET /api/v1/payments` — Query payment transaction ledger
- `GET /api/v1/dashboard/summary` — Aggregate business metrics (MRR, revenue, receivables)
- `GET /api/v1/dashboard/revenue-trend` — Historical monthly revenue time-series

---

## Testing & Quality Assurance

### Running Backend Test Suite

The backend includes a comprehensive suite of 150+ unit and integration tests covering permissions, state transitions, customer isolation, duplicate billing, and pricing math:

```bash
cd backend
source .venv/bin/activate

# Execute all tests
pytest -v

# Run with test coverage report
pytest --cov=app tests/
```

### Running Frontend Linter & Build Verification

```bash
cd frontend

# Run fast code linting via oxlint
npm run lint

# Verify TypeScript/JSX production build
npm run build
```

---

## Troubleshooting & Gotchas

1. **`passlib` / `bcrypt` Incompatibility**:
   - `bcrypt>=4.1.0` removed `__about__`, which breaks `passlib 1.7.4`.
   - **Resolution**: Pin `bcrypt==4.0.1` in `backend/requirements.txt` (already configured).

2. **Customer Registration Role Assignment**:
   - `POST /api/v1/auth/register` intentionally ignores any `"role"` attribute in the payload and assigns `customer`.
   - **Resolution**: To create internal staff or admin operators, log in as an administrator and use the Staff Creation modal in `/customers` or the `POST /api/v1/auth/staff` endpoint.

3. **CORS Restrictions**:
   - If the frontend reports network connection errors, verify that `FRONTEND_ORIGIN` in `backend/.env` strictly matches your frontend address (e.g. `http://localhost:5173` without trailing slashes).

4. **Database Connection Pool Exhaustion**:
   - In high-concurrency production deployments, configure `pool_size` and `max_overflow` in `backend/app/db/session.py` to match PostgreSQL `max_connections`.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
