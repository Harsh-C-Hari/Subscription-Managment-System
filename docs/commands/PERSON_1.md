# PERSON 1 (Harsh) — Command sheet (Windows PowerShell)
Branch: `backend-foundation`. Repo: https://github.com/Harsh-C-Hari/Subscription-Managment-System.git

## 0. One-time identity (replace the two placeholders)
```powershell
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

## 1. Repository initialisation (ONLY you do this; the GitHub repo is empty)
Unzip the handoff package into `C:\Users\<you>\Desktop\Subscription-Managment-System` so that `docs`, `backend`, `frontend`, `README.md` are inside it. Then:
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git init -b main
git remote add origin https://github.com/Harsh-C-Hari/Subscription-Managment-System.git
git add .
git status
git commit -m "chore: add architecture docs, repo skeleton and contracts"
git push -u origin main
```
Create `integration` and the four working branches, all from the same commit:
```powershell
git checkout -b integration
git push -u origin integration
git branch backend-foundation integration
git branch backend-billing integration
git branch frontend-foundation integration
git branch frontend-billing integration
git push -u origin backend-foundation
git push -u origin backend-billing
git push -u origin frontend-foundation
git push -u origin frontend-billing
git checkout backend-foundation
git branch -a
```
Optional but recommended: on GitHub -> Settings -> Branches -> add a protection rule for `main` (require a pull request). Settings -> Collaborators: confirm the 3 teammates are listed.

## 2. Backend environment
Prereqs: Python 3.11+, PostgreSQL 15+ running locally.
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install fastapi "uvicorn[standard]" "sqlalchemy>=2.0" psycopg2-binary alembic pydantic-settings email-validator "python-jose[cryptography]" "passlib[bcrypt]" "bcrypt==4.0.1" python-dateutil pytest httpx
pip freeze > requirements.txt
Copy-Item .env.example .env
notepad .env
```
Edit `.env`: set `DATABASE_URL` with your local Postgres password and a long random `JWT_SECRET_KEY`. Create databases (enter your postgres password when prompted):
```powershell
psql -U postgres -c "CREATE DATABASE brightloop;"
psql -U postgres -c "CREATE DATABASE brightloop_test;"
```
If `psql` is not found, use pgAdmin -> create the two databases.

## 3. Let Antigravity build it
Open the repo folder in Antigravity, on branch `backend-foundation`, paste the **Antigravity implementation prompt (P1)** from `docs/TEAM_TASKS.md`.

## 4. Run migrations, seed, start, test
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
alembic heads
python -m app.seed
uvicorn app.main:app --reload --port 8000
```
Open http://localhost:8000/docs . In a second PowerShell:
```powershell
cd $HOME\Desktop\Subscription-Managment-System\backend
.\.venv\Scripts\Activate.ps1
pytest -q
```

## 5. Commit and push (every 30-45 min)
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git status
git add backend
git commit -m "feat(backend): describe what you did"
git push origin backend-foundation
```
Do not `git add .` blindly: check `git status` for `.env` or `.venv` first (they are in .gitignore).

## 6. Open PR #1 (target 1:30 PM) and PR #2
https://github.com/Harsh-C-Hari/Subscription-Managment-System/pull/new/backend-foundation
Base must be `integration`. (As tech lead you may merge your own PR once `pytest -q` passes.) After merging, tell everyone: "integration updated".

## 7. Reviewing and merging teammates' PRs
GitHub -> Pull requests -> open PR -> Files changed -> check ownership (see TEAM_TASKS) and no secrets -> Merge pull request -> Create a merge commit.
CLI alternative (example for `backend-billing`):
```powershell
git fetch origin
git checkout integration
git pull origin integration
git merge --no-ff origin/backend-billing -m "merge: backend-billing into integration"
git push origin integration
```
Replace `backend-billing` with `frontend-foundation` or `frontend-billing` as needed. If a conflict appears: `git status`, fix files, `git add`, `git commit`; or `git merge --abort` to cancel before committing.

## 8. Bring integration into your branch
```powershell
git fetch origin
git checkout backend-foundation
git merge origin/integration
git push origin backend-foundation
```

## 9. Final merge to main (about 4:45 PM)
Web: https://github.com/Harsh-C-Hari/Subscription-Managment-System/compare/main...integration -> Create pull request -> Merge pull request.
CLI alternative:
```powershell
git fetch origin
git checkout main
git pull origin main
git merge --no-ff origin/integration -m "release: MVP"
git push origin main
git tag mvp-v1
git push origin mvp-v1
```
