# PERSON 2 — Backend business logic — Command sheet (Windows PowerShell)
Branch: `backend-billing`. Do NOT run `git init`. Wait for Harsh's message "repo ready" before cloning.

## 0. One-time identity (replace the placeholders)
```powershell
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

## 1. Clone and switch to your branch
```powershell
cd $HOME\Desktop
git clone https://github.com/Harsh-C-Hari/Subscription-Managment-System.git
cd Subscription-Managment-System
git fetch origin
git checkout integration
git pull origin integration
git checkout backend-billing
git status
```
Read: `docs/PROJECT_SPEC.md`, `docs/DATABASE_SCHEMA.md`, `docs/API_CONTRACT.md`, `docs/TEAM_TASKS.md`.

## 2. Backend environment
Prereqs: Python 3.11+, PostgreSQL 15+.
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" "sqlalchemy>=2.0" psycopg2-binary alembic pydantic-settings email-validator "python-jose[cryptography]" "passlib[bcrypt]" "bcrypt==4.0.1" python-dateutil pytest httpx
Copy-Item .env.example .env
notepad .env
psql -U postgres -c "CREATE DATABASE brightloop;"
psql -U postgres -c "CREATE DATABASE brightloop_test;"
```
Put YOUR local Postgres password in `DATABASE_URL`. Never commit `.env`. Extra packages you need: add them to `backend/requirements-billing.txt` (yours), not `requirements.txt`.

## 3. Let Antigravity build it
Open the repo in Antigravity on branch `backend-billing`; paste the **Antigravity implementation prompt (P2)** from `docs/TEAM_TASKS.md`. Start with STEP A (pure services + unit tests), which needs no database.

## 4. Get Person 1's models (after PR #1 is merged into integration)
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git add backend
git commit -m "wip: services and tests"
git fetch origin
git merge origin/integration
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
alembic heads
python -m app.seed
```
`alembic heads` must show exactly ONE head. If it shows two, stop and tell Harsh. Never run `alembic revision` without announcing "taking migration token" and getting a reply.

## 5. Run and test
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
Docs: http://localhost:8000/docs . In another PowerShell:
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

## 6. Stage, commit, push (every 30-45 min)
Only add your own files:
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git status
git add backend/app/services backend/app/routers/billing backend/app/routers/billing_router.py backend/app/schemas backend/app/models backend/tests backend/requirements-billing.txt
git commit -m "feat(billing): describe what you did"
git push origin backend-billing
```
(`git status` first: if it lists files you do not own, do not add them.) If the push is rejected: `git fetch origin`, `git merge origin/backend-billing`, fix conflicts, `git push origin backend-billing`. Never force push.

## 7. Update your branch from integration (after Harsh announces a merge)
```powershell
git add -A
git commit -m "wip"
git fetch origin
git merge origin/integration
git push origin backend-billing
```
(If `git commit` says nothing to commit, that's fine.) Conflict? `git status`, edit files, `git add <file>`, `git commit`. To cancel before committing: `git merge --abort`.

## 8. Open the pull request
https://github.com/Harsh-C-Hari/Subscription-Managment-System/pull/new/backend-billing
Base must be `integration`. Targets: first PR by 2:00 PM (services + subscriptions), final billing PR by 2:45 PM. Message the team "PR ready: backend-billing".
