# PERSON 3 — Frontend foundation — Command sheet (Windows PowerShell)
Branch: `frontend-foundation`. Do NOT run `git init`. Wait for Harsh's message "repo ready" before cloning.

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
git checkout frontend-foundation
git status
```
Read: `docs/PROJECT_SPEC.md`, `docs/API_CONTRACT.md`, `docs/TEAM_TASKS.md`.

## 2. Create the Vite project (first time only, inside `frontend`)
Prereq: Node.js 18+ (`node -v`). If `frontend` already contains a `package.json`, skip the create step and run `npm install` only.
```powershell
cd $HOME\Desktop\Subscription-Managment-System\frontend
npm create vite@latest . -- --template react
npm install
npm install axios react-router-dom lucide-react recharts
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
Copy-Item .env.example .env
```
(If Vite asks about a non-empty directory, choose "Ignore files and continue". Keep the existing `.env.example`.) Antigravity will finish the Tailwind config and the app code from your prompt.

## 3. Let Antigravity build it
Open the repo in Antigravity on branch `frontend-foundation`; paste the **Antigravity implementation prompt (P3)** from `docs/TEAM_TASKS.md`. Push the layout/client/UI-kit first so Person 4 can use it (target: PR #1 by 1:30 PM).

## 4. Run and build
```powershell
cd $HOME\Desktop\Subscription-Managment-System\frontend
npm run dev
```
Open http://localhost:5173 . Before each PR:
```powershell
npm run build
```
The backend (Person 1) runs on http://localhost:8000 once merged; set `VITE_API_BASE_URL=http://localhost:8000/api/v1` in `frontend/.env`.

## 5. Stage, commit, push (every 30-45 min)
```powershell
cd $HOME\Desktop\Subscription-Managment-System
git status
git add frontend
git commit -m "feat(frontend): describe what you did"
git push origin frontend-foundation
```
Check `git status` first: never add `node_modules`, `dist` or `.env` (they are ignored). If the push is rejected: `git fetch origin`, `git merge origin/frontend-foundation`, resolve, `git push origin frontend-foundation`. Never force push. Do not edit `frontend/src/pages/billing`, `frontend/src/pages/portal`, `frontend/src/api/billing.js`, `frontend/src/billingRoutes.jsx` (Person 4's).

## 6. Update your branch from integration (after Harsh announces a merge)
```powershell
git add -A
git commit -m "wip"
git fetch origin
git merge origin/integration
npm --prefix frontend install
git push origin frontend-foundation
```
Conflict? `git status`, edit, `git add <file>`, `git commit`. Cancel before committing: `git merge --abort`. Common conflict files: `frontend/package.json`, `package-lock.json`, `App.jsx`.

## 7. Open the pull request
https://github.com/Harsh-C-Hari/Subscription-Managment-System/pull/new/frontend-foundation
Base must be `integration`. Targets: PR #1 (layout, client, auth, UI kit) by 1:30 PM; PR #2 (pages) by 2:30 PM. Message the team "PR ready: frontend-foundation".
