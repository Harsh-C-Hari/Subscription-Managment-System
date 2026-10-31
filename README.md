# Brightloop Subscription Management System

Subscription billing for Brightloop Software: products, plans, customers, subscriptions, invoices, payments, dashboard and a customer portal.

**Stack:** React + Vite + Tailwind (frontend) · FastAPI + SQLAlchemy 2 + Alembic (backend) · PostgreSQL. API at `/api/v1`.

## Read before coding
1. [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)
2. [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
3. [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
4. [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md)
5. [docs/TEAM_TASKS.md](docs/TEAM_TASKS.md) (your scope and prompts)
6. [docs/TESTING_PLAN.md](docs/TESTING_PLAN.md)

Your command sheet: [Person 1](docs/commands/PERSON_1.md) · [Person 2](docs/commands/PERSON_2.md) · [Person 3](docs/commands/PERSON_3.md) · [Person 4](docs/commands/PERSON_4.md)

## Branches
`main` (stable) · `integration` (merged work) · `backend-foundation` (P1) · `backend-billing` (P2) · `frontend-foundation` (P3) · `frontend-billing` (P4). PRs go into `integration`. Never push to `main`. Never force push.

## Run locally
Backend:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env   # then edit DATABASE_URL and JWT_SECRET_KEY
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```
Frontend:
```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```
Backend docs: http://localhost:8000/docs · Frontend: http://localhost:5173

Default admin (from seed): `admin@brightloop.com` / value of `ADMIN_PASSWORD` in `backend/.env`.
