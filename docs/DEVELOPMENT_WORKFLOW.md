# DEVELOPMENT_WORKFLOW — Git, branches, PRs, integration

Repo: https://github.com/Harsh-C-Hari/Subscription-Managment-System
Clone URL: `https://github.com/Harsh-C-Hari/Subscription-Managment-System.git`

## 1. Branches (use these exact names everywhere)
| Branch | Who | Purpose |
|---|---|---|
| `main` | nobody pushes directly | stable submission branch |
| `integration` | merged by Person 1 via PR | tested combined work |
| `backend-foundation` | Person 1 (Harsh) | auth, users, products, variants, plans, customers, DB/Alembic |
| `backend-billing` | Person 2 | subscriptions, invoices, payments, tax, discount, dashboard |
| `frontend-foundation` | Person 3 | layout, auth UI, dashboard, products, plans, customers |
| `frontend-billing` | Person 4 | subscriptions, invoices, payments, tax/discount UI, portal |

Rules: every working branch starts from `integration`; PRs go **into `integration`**; Person 1 reviews and merges; final PR is `integration` -> `main`. **No force pushes. Ever.** Never `git push --force`, never `git reset --hard` on a branch with unpushed work.

## 2. Git in plain words
- `git status` — "what changed on my machine and which branch am I on?" Run it constantly.
- `git fetch origin` — "download the latest info from GitHub, but don't change my files." Safe.
- `git pull origin <branch>` — fetch + merge that branch into whatever you are on. Changes your files.
- `git merge <branch>` — bring another branch's commits into your current branch.
- `git push origin <branch>` — upload your commits to GitHub.
- **Merging vs pulling:** a *pull* updates your local copy of a branch from GitHub. A *merge* combines two different branches. Pulling `integration` while on `integration` just updates it. To get others' work into *your* branch you merge `integration` into it (section 6).

## 3. One-time setup (everyone, PowerShell)
```powershell
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

## 4. Person 1 only: initialise the empty repo (A, B, C)
The GitHub repo is empty, so ONLY Harsh runs `git init`. Everyone else clones.
```powershell
cd $HOME\Desktop
mkdir Subscription-Managment-System   # skip if you already unzipped the handoff here
cd Subscription-Managment-System
# copy the handoff files into this folder first, then:
git init -b main
git remote add origin https://github.com/Harsh-C-Hari/Subscription-Managment-System.git
git add .
git commit -m "chore: add architecture docs, repo skeleton and contracts"
git push -u origin main
git checkout -b integration
git push -u origin integration
git checkout -b backend-foundation integration
git push -u origin backend-foundation
```
Then create the other three branches **from integration** so they share history (do this before announcing):
```powershell
git checkout integration
git branch backend-billing integration
git branch frontend-foundation integration
git branch frontend-billing integration
git push -u origin backend-billing
git push -u origin frontend-foundation
git push -u origin frontend-billing
git checkout backend-foundation
```
If `git push` says the remote has content (someone clicked "Add README"), STOP: run `git pull origin main --allow-unrelated-histories`, resolve, then push. Do not force.

## 5. Everyone else: clone and start (D, E)
Replace `BRANCH` with your branch (`backend-billing`, `frontend-foundation` or `frontend-billing`).
```powershell
cd $HOME\Desktop
git clone https://github.com/Harsh-C-Hari/Subscription-Managment-System.git
cd Subscription-Managment-System
git fetch origin
git checkout integration
git pull origin integration
git checkout BRANCH            # exists on GitHub; git tracks it automatically
git status
```
Do NOT run `git init`. Do NOT create your own branch name.

## 6. Daily loop (F, G)
Commit and push often (at least every 30–45 min):
```powershell
git status
git add <your-owned-folders>          # e.g. git add frontend/src/pages/billing
git commit -m "feat(invoices): invoice list page"
git push origin BRANCH
```
Pull in the latest integration (do this before every PR and whenever Person 1 announces a merge):
```powershell
git add . ; git commit -m "wip"       # commit first so nothing is lost (skip if status is clean)
git fetch origin
git merge origin/integration
# if there are no conflicts: run your app/tests, then
git push origin BRANCH
```

### If `git push` is rejected ("remote contains work that you do not have")
Someone (usually you on another computer, or Person 1) updated the same branch.
```powershell
git fetch origin
git merge origin/BRANCH      # merge the remote copy of YOUR branch into your local one
# fix conflicts if any (section 7), then
git push origin BRANCH
```
Never use `--force`.

## 7. Merge conflicts — safe recovery (H)
A conflict means two people edited the same lines. Git stops and marks the files.
1. `git status` — files under "both modified" are the conflicts.
2. Open each file. You will see:
```
<<<<<<< HEAD
your version
=======
their version
>>>>>>> origin/integration
```
3. Decide the correct final text (often keep both), delete the three marker lines, save.
4. `git add <file>` then `git commit` (accept the default message).
5. Run the app and tests, then `git push origin BRANCH`.

**Want to back out?** Only while the merge is unfinished: `git merge --abort` returns you exactly to before the merge; nothing is lost. If you already committed the merge and it is wrong: `git revert -m 1 HEAD` (creates a new undoing commit). If unsure, **stop and message Person 1; do not guess and do not delete files.**
If you conflict in a file you do not own: keep the owner's version of that file (`git checkout --theirs <file>` for integration's version during a merge from integration) and tell the owner.

Common conflict-risk files: `backend/app/main.py`, `backend/app/models/__init__.py`, `backend/alembic/versions/*`, `backend/requirements.txt`, `frontend/package.json`, `package-lock.json`, `frontend/src/App.jsx`, `frontend/src/routes.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `docs/*`. To avoid them: the skeleton pre-creates one router file and one `*_routes.jsx` file per developer, and `__init__` files already import everything (see TEAM_TASKS "Pre-wired shared files").

## 8. Pull requests (I, J, 13)
Developer:
1. Run your app locally; run your tests.
2. `git add` / `git commit` / `git push origin BRANCH`.
3. Open `https://github.com/Harsh-C-Hari/Subscription-Managment-System/pull/new/BRANCH`
   - **base: `integration`**, compare: `BRANCH`. (Check the base dropdown! Not `main`.)
   - Title: `[BRANCH] short summary`. Description: what works, what was tested, any contract changes.
4. Message the team: "PR ready: BRANCH".

Person 1 reviews (GitHub web):
1. Open the PR -> **Files changed**. Check: only files the author owns changed; no `.env`, no `node_modules`, no `.venv`; endpoint names/fields match API_CONTRACT; no float money.
2. If good -> **Merge pull request** -> choose **Create a merge commit** -> Confirm. If not -> comment and request changes.
Person 1 merge via command line (alternative):
```powershell
git fetch origin
git checkout integration
git pull origin integration
git merge --no-ff origin/BRANCH -m "merge: BRANCH into integration"
# run the app quickly, then
git push origin integration
```
Then announce: "integration updated: <what>".

## 9. Update local integration after a merge (K)
```powershell
git fetch origin
git checkout integration
git pull origin integration
git checkout BRANCH
git merge integration          # same as origin/integration after the pull above
git push origin BRANCH
```

## 10. Final merge to main (L) — Person 1 only
Web: GitHub -> Pull requests -> New pull request -> base `main`, compare `integration` -> create -> check Files changed -> **Merge pull request**.
CLI alternative:
```powershell
git fetch origin
git checkout main
git pull origin main
git merge --no-ff origin/integration -m "release: MVP"
git push origin main
```
(If your GitHub branch protection blocks direct pushes, use the web PR.) Tag it: `git tag mvp-v1 ; git push origin mvp-v1`.

## 11. Migration token (backend devs)
See DATABASE_SCHEMA "Migration procedure". Short version: P1 creates the single initial migration; afterwards announce "taking migration token" before creating any migration; always `alembic heads` must show exactly one head before and after.

## 12. Timeline (today, Sat 31 Oct 2026, IST)
| Time | Phase | P1 Harsh | P2 | P3 | P4 |
|---|---|---|---|---|---|
| 12:15–12:45 | 1 Foundation | push main+branches, send instructions | clone, read docs, install | clone, read docs, install | clone, read docs, install |
| 12:45–1:45 | 2 Parallel | backend skeleton, ALL models + 0001 migration, auth+deps, seed -> **PR #1 by 1:30** | services: money/date/tax/discount/billing pure functions + unit tests (no DB needed) | Vite+Tailwind, router, client.js, AuthContext, layout, ui kit -> **PR #1 by 1:30** | api/billing.js, subscriptions list/create pages built against contract with mock adapter |
| 1:45–3:00 | 2 Parallel | products/variants/plans/customers APIs, PR #2 by 2:30 | models wiring, subscription + invoice + payment endpoints, dashboard API, PR by 2:45 | login/register, dashboard, products, plans, customers pages, PR #2 by 2:30 | invoices, payments, taxes, discounts, quotations pages (swap mock -> real API) |
| 3:00–4:00 | 3 Integration | merge PRs as they arrive, fix contract mismatches | PR #2, fix bugs | PR #3 polish | PR #2/#3, portal |
| 4:00–4:45 | 4 Stabilise | run demo scenario, TESTING_PLAN checklist | fix backend bugs | fix UI bugs | fix UI bugs |
| 4:45 | freeze | merge integration -> main by 4:50 | | | |
Dependencies: P2 does not wait for P1 endpoints (only for the merged models after PR #1). P4 does not wait for P3 pages (only for layout/client/ui-kit in PR #1; until then use the mock adapter described in TEAM_TASKS).
