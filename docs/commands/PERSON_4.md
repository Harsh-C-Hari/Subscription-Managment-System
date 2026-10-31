# PERSON 4 — Frontend business interfaces — Command sheet (Windows PowerShell)
Branch: `frontend-billing`. Do NOT run `git init`. Wait for Harsh's message "repo ready" before cloning.

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
git checkout frontend-billing
git status
```
Read: `docs/PROJECT_SPEC.md`, `docs/API_CONTRACT.md` (sections 7-14), `docs/TEAM_TASKS.md`.

## 2. Install the frontend
Person 3 creates the Vite project. Until their PR #1 is merged there is no `package.json` — in that window you only write `src/api/billing.js`, `src/api/mockBilling.js` and page files (Antigravity creates the folders). When their PR #1 is merged:
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git add frontend
git commit -m "wip: billing api and pages"
git fetch origin
git merge origin/integration
cd frontend
npm install
Copy-Item .env.example .env
```
Set in `frontend/.env`: `VITE_API_BASE_URL=http://localhost:8000/api/v1` and `VITE_USE_MOCKS=true` (change to `false` once Person 1/2's backend is merged and running).

## 3. Let Antigravity build it
Open the repo in Antigravity on branch `frontend-billing`; paste the **Antigravity implementation prompt (P4)** from `docs/TEAM_TASKS.md`.

## 4. Run and build
```powershell
cd $HOME\Desktop\Subscription-Managment-System\frontend
npm run dev
```
Open http://localhost:5173 . Before each PR: `npm run build`.

## 5. Stage, commit, push (every 30-45 min)
Only add your own files:
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git status
git add frontend/src/pages/billing frontend/src/pages/portal frontend/src/api/billing.js frontend/src/api/mockBilling.js frontend/src/billingRoutes.jsx frontend/src/components/billing
git commit -m "feat(billing-ui): describe what you did"
git push origin frontend-billing
```
If `git add` complains a path does not exist yet, drop it from the list. If the push is rejected: `git fetch origin`, `git merge origin/frontend-billing`, resolve, `git push origin frontend-billing`. Never force push.

## 6. Update your branch from integration (after Harsh announces a merge)
```powershell
git add -A
git commit -m "wip"
git fetch origin
git merge origin/integration
npm --prefix frontend install
git push origin frontend-billing
```
Conflict? `git status`, edit, `git add <file>`, `git commit`. Cancel before committing: `git merge --abort`. For files you do not own, keep the incoming (integration) version and tell the owner.

## 7. Open the pull request
https://github.com/Harsh-C-Hari/Subscription-Managment-System/pull/new/frontend-billing
Base must be `integration`. Targets: PR #1 (subscriptions + api/billing.js) by 2:15 PM; PR #2 (invoices, payments) by 3:00 PM; PR #3 (taxes, discounts, quotations, portal) by 3:45 PM. Message the team "PR ready: frontend-billing".
