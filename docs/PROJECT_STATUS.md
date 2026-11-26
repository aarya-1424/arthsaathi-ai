# ArthSaathi: Project Status and Hand-over Prompt

_Last updated: 24 November 2026. Milestones 1–4 are complete and merged into `main`._

Use this whole document as the starting prompt for any AI coding assistant (or new teammate) working on ArthSaathi. It describes everything that exists today, how it is built, the rules we follow, and what comes next.

---

## 0. How to work with the founder (read first)

- Talk in **very simple, plain English**. Explain any technical word in one short line.
- Work in **small milestones**. Before each one, say what you will build. After it, report: files changed, tests run and their results, and anything not done or not verified.
- **Never** mention any company or employer in this project. ArthSaathi is the founder's **personal project**.
- Plan before big decisions; ask before changing scope, architecture, or the database design.
- **Never put secrets in code or chat.** Real keys live only in `backend/.env` and `frontend/.env.local` (both are git-ignored).
- Git workflow: one branch per milestone (for example `milestone-5-goals`), commit, push to GitHub. **The founder creates the pull requests and merges them.** Never push to `main` directly.
- Do not claim something is tested unless it was actually tested. Report failures honestly.

---

## 1. What ArthSaathi is

**ArthSaathi** (Arth = money, Saathi = companion) is an AI-powered personal finance assistant and financial literacy web app for **India's middle class**: salaried people, families, students and young professionals. It helps people understand their money, budget, save, set goals, understand documents and discover government schemes, in simple English, Hindi and Hinglish.

It is an **educational and planning tool**, not a registered financial advisor, CA, bank or government body. It never guarantees returns, never invents numbers, and always shows assumptions.

**Current stage:** building a complete, high-quality MVP to **pitch to founders and investors**. It is not publicly launched. Hosting will be on **Vercel (website) and Render (server)** using their free sub-domains (no custom domain yet).

---

## 2. Technology stack (decided and in use)

| Part | Choice |
|---|---|
| Website (frontend) | React 19 + Vite 8 + TypeScript + Tailwind CSS v4 |
| Server (backend) | Python 3.12 + FastAPI |
| Database | PostgreSQL on **Supabase** (Mumbai region, `ap-south-1`) |
| Login | **Supabase Auth**: email + password only |
| AI (planned, Milestone 7) | **Grok (xAI) free API**, behind one small provider interface so it can be swapped later; key lives only on the server |
| Frontend tests | Vitest + React Testing Library + user-event (jsdom) |
| Backend tests | pytest + FastAPI TestClient |
| CI | GitHub Actions: runs backend tests, frontend tests and frontend build on every pull request and on `main` |
| Hosting (planned) | Vercel (frontend), Render (backend) |

- GitHub repository: `aarya-1424/arthsaathi-ai`. The old "LegalAI" code that was in it was removed in Milestone 1 (it is still in git history).
- Supabase project ref: `vuebkgmqyndbrercvmip` (URL `https://vuebkgmqyndbrercvmip.supabase.co`). Login tokens are signed with **ES256** (asymmetric keys, published at `/auth/v1/.well-known/jwks.json`).

---

## 3. Folder structure

```
Arthsaathi/
├── .github/workflows/ci.yml        # tests + build on every PR
├── .env.example                    # backend settings template (no real values)
├── .gitignore                      # ignores .env, .env.*, node_modules, .venv, dist, *.db, *.tsbuildinfo
├── README.md                       # how to run and test
├── docs/
│   ├── DECISIONS.md                # key product/tech decisions
│   ├── BEFORE_LAUNCH.md            # things knowingly postponed until a public launch
│   └── PROJECT_STATUS.md           # this file
├── supabase/migrations/            # database changes, applied in order
│   ├── 20261124000001_profiles.sql
│   ├── 20261124000002_financial_profiles.sql
│   └── 20261124000003_money.sql
├── backend/
│   ├── requirements.txt            # fastapi, uvicorn, pydantic-settings, pyjwt[crypto], httpx
│   ├── requirements-dev.txt        # + pytest
│   ├── pytest.ini
│   ├── app/
│   │   ├── main.py                 # app setup, CORS, error handlers, routers
│   │   ├── config.py               # settings from env
│   │   ├── auth.py                 # login token verification
│   │   ├── db.py                   # Supabase REST client (uses the USER's token)
│   │   ├── api/health.py           # GET /api/health
│   │   ├── api/me.py               # GET /api/me
│   │   ├── api/profile.py          # GET/PUT /api/profile
│   │   ├── api/money.py            # entries, budgets, summary
│   │   ├── schemas/profile.py      # profile validation rules
│   │   ├── schemas/money.py        # entry and budget validation rules
│   │   ├── money/calc.py           # ALL money maths (pure functions)
│   │   └── money/repo.py           # database reads/writes for money
│   └── tests/                      # test_health, test_auth, test_profile, test_money_calc, test_money_api
└── frontend/
    ├── .env.example                # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
    ├── vite.config.ts              # dev proxy /api -> http://localhost:8000, test setup
    └── src/
        ├── main.tsx, App.tsx       # app shell and simple view switching
        ├── index.css               # Tailwind import + temporary neutral colours
        ├── lib/supabase.ts         # Supabase browser client
        ├── lib/api.ts              # calls our server with the login token; friendly errors
        ├── auth/AuthProvider.tsx   # session state, password-recovery detection
        ├── auth/AuthScreen.tsx     # sign in / sign up / forgot password / new password
        ├── profile/types.ts        # profile types, option lists, states, amount presets, ₹ formatting
        ├── profile/ProfileWizard.tsx  # 4-step onboarding, reused for "Edit my profile"
        ├── money/types.ts          # entry/summary types, categories, month helpers
        ├── money/MoneyPage.tsx     # My Money page
        ├── money/EntryForm.tsx     # add / edit an entry
        ├── money/BudgetEditor.tsx  # set monthly category limits
        └── *.test.ts(x)            # tests next to the code
```

---

## 4. Settings (environment variables)

**`backend/.env`** (git-ignored):
- `ENVIRONMENT`: `development` or `production` (production hides `/docs`).
- `CORS_ORIGINS`: comma-separated websites allowed to call the API (now `http://localhost:5173`).
- `SUPABASE_URL`: project URL (public).
- `SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (public, `sb_publishable_...`).
- Planned later (secrets): `XAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (only if truly needed, e.g. account deletion).

**`frontend/.env.local`** (git-ignored):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (both public by design).

**Supabase dashboard settings chosen:**
- Sign-in method: **Email + password only**. Google sign-in is **off**.
- **"Confirm email" is OFF** (no domain/email service yet). Sign-up logs the user in immediately.
- Password reset emails use Supabase's built-in sender, which only reaches project team members until a real email service is added.

---

## 5. Database (Supabase Postgres)

All tables have **row-level security (RLS) ON** with four policies (select/insert/update/delete) allowing a user to touch **only their own rows** (`auth.uid() = user_id`). Anonymous (not signed in) users have **all access revoked**. Every table has `created_at` and `updated_at` (kept fresh by the trigger function `public.set_updated_at()`, which has a fixed empty `search_path`). Deleting a user from `auth.users` **cascades** and deletes all their data.

### `public.profiles` (Milestone 2)
- `id` uuid PK → `auth.users(id)` on delete cascade
- `display_name` text (≤ 80 chars)
- Created automatically on sign-up by trigger `on_auth_user_created` → function `public.handle_new_user()` (security definer, empty search_path, execute revoked from `public`, `anon`, `authenticated`). It copies `display_name` from sign-up metadata.

### `public.financial_profiles` (Milestone 3), one row per user
- `user_id` uuid PK → `auth.users` cascade
- `occupation` (required): `student | salaried | self_employed | homemaker | other`
- `age_range`: `under_18 | 18_24 | 25_34 | 35_44 | 45_54 | 55_plus` (optional)
- `state` text ≤ 60 (optional; the server limits it to the 28 states + 8 UTs)
- `monthly_income` bigint (required, 0 to 10 crore)
- `income_source`: `salary | allowance | business | freelance | pension | family | other` (optional)
- `monthly_expenses` bigint (required, 0 to 10 crore)
- `monthly_savings`, `monthly_emi` bigint (optional, 0 to 10 crore)
- `dependents` smallint 0–20 (optional)
- `emergency_fund` bigint (optional, 0 to ₹1,000 crore)
- `goals` text[] (≤ 12, each must be one of: `save_money, emergency_fund, manage_expenses, pay_off_debt, buy_gadget, buy_vehicle, education, family_expense, learn_investing, understand_taxes, other`)
- `other_goal` text ≤ 100 (kept only when `other` is ticked)
- `knowledge_level` (required): `beginner | basic | intermediate | advanced`
- `onboarding_completed_at` timestamptz (set on first save, never overwritten)

### `public.transactions` (Milestone 4): income and expense entries
- `id` uuid PK; `user_id` uuid **defaults to `auth.uid()`** (the browser never sends it)
- `kind`: `income | expense`
- `amount` bigint, > 0 and ≤ 10 crore (whole rupees)
- `occurred_on` date ≥ 2000-01-01
- `category`, checked against kind:
  - income: `salary, allowance, freelance, business, other`
  - expense: `rent, food, groceries, transport, education, medical, utilities, shopping, family, entertainment, emi, other`
- `description` ≤ 120, `notes` ≤ 500 (optional)
- Index `(user_id, occurred_on desc, created_at desc)`

### `public.budgets` (Milestone 4): monthly category limits
- `id`, `user_id` (defaults to `auth.uid()`), `month` (date, must be the 1st of a month), `category` (expense categories only), `amount` > 0 ≤ 10 crore
- Unique `(user_id, month, category)`

### Function `public.set_month_budget(p_month date, p_limits jsonb)`
- **security invoker** (runs as the signed-in user, so RLS applies), empty `search_path`.
- Deletes that month's budget rows for the user and inserts the new list **in one step (all or nothing)**. Duplicates fail the whole call and leave the old budget untouched.
- Execute granted only to `authenticated`.

**Verified on the live database:** cross-user read/update/delete returns 0 rows; inserting for another user is blocked; anonymous access is denied; negative money, unknown goals and category/kind mismatches are refused; the Supabase security advisor shows **no issues** except "Leaked password protection disabled" (on the before-launch list).

---

## 6. Backend (FastAPI)

### Security design
- **Login check (`auth.py`):** every protected request needs `Authorization: Bearer <Supabase access token>`. The server verifies the **signature** (ES256/RS256 via Supabase's public JWKS, cached for 1 hour), **issuer** (`<SUPABASE_URL>/auth/v1`), **audience** (`authenticated`), **expiry** and required claims (`exp, sub, iss, aud`). Unsigned (`alg: none`), expired, wrong-key, wrong-issuer and wrong-audience tokens are all rejected with the same message: "Please sign in to continue." If `SUPABASE_URL` is missing, everyone is rejected.
- **Database access (`db.py`):** the server calls Supabase's REST API using the publishable key **plus the user's own token**, so RLS protects data **even if our server has a bug**. The all-powerful service-role key is **not used anywhere**. The token is kept on `CurrentUser.token` but excluded from every API response.
- **Errors:** database 401/403 → 401; 400/409/422 → 422 "Some details are not valid…"; 5xx or network failure/timeout (10 s) → 503 "We could not reach the database…". Logs contain only method, path and status, **never user data**.
- **Validation errors** return `{"detail": "...", "fields": [...]}`, naming the fields with problems **without echoing what the user typed**.
- **Unhandled errors** return a generic 500 message; only the error type and path are logged.
- **CORS** allows only `CORS_ORIGINS`; methods GET/POST/PUT/PATCH/DELETE; headers Authorization and Content-Type.
- **Money inputs** use strict integers (no text, decimals or booleans) and whole rupees only.

### API endpoints (all under `/api`)

| Method & path | Login | What it does |
|---|---|---|
| `GET /health` | No | `{"status":"ok","service":"arthsaathi-api"}` |
| `GET /me` | Yes | `{id, email}` of the signed-in user |
| `GET /profile` | Yes | `{display_name, financial (or null), onboarding_complete}` |
| `PUT /profile` | Yes | Saves onboarding/profile (upsert on `user_id`) and `display_name`. Owner always comes from the token; an extra `user_id` field is rejected. |
| `GET /transactions?month=YYYY-MM[&kind=income\|expense]` | Yes | Entries for the month, newest first, max 1,000 (`truncated` flag) |
| `POST /transactions` | Yes | Add an entry (201) |
| `PUT /transactions/{uuid}` | Yes | Replace an entry; 404 if missing or not yours |
| `DELETE /transactions/{uuid}` | Yes | Delete; 204, or 404 if missing or not yours |
| `GET /budgets?month=YYYY-MM` | Yes | `{month, limits:[{category, amount}]}` |
| `PUT /budgets?month=YYYY-MM` | Yes | Replace the month's limits (all or nothing); body `{limits:[...]}` with no duplicate categories |
| `GET /money/summary?month=YYYY-MM` | Yes | Calculated month summary (below) |

Entry rules: amount 1 to ₹10 crore; category must match kind; date from 2000-01-01 up to **tomorrow in India time (IST)** (so late-night entries never fail); description/notes are trimmed, and empty becomes null. Month must match `20YY-MM`.

### Money calculations (`app/money/calc.py`): plain code, never AI
- `percent(part, whole)`: one decimal, **round half up** using exact `Decimal` maths (12.25 → 12.3); `None` when whole ≤ 0.
- `month_bounds("2026-12")` → (2026-12-01, 2027-01-01) (end not included); `previous_month()` handles January → December.
- `budget_status(limit, spent)`: `over` if spent > limit; `near` if spent ≥ 80% (integer maths); else `ok`. Exactly 100% counts as "near", not "over".
- `summarize()` returns: `total_income`, `total_expenses`, `remaining` (negative = overspent), `savings_rate_percent` (remaining ÷ income; `None` if no income), `entry_count`, `categories` (spend per expense category with share %, sorted by amount then name), `budgets` (limit, spent, remaining, used %, status), `budget_total/spent/remaining` (only budgeted categories), and `comparison` with last month (`previous_income`, `previous_expenses`, `expense_change`), shown **only if last month has data**.

---

## 7. Frontend (current screens: plain, functional, not yet designed)

The UI is **deliberately plain** and waiting for the founder's templates. The final design must be **unique, not a usual top-navigation-bar website**, calm, trustworthy, mobile-first and accessible. View switching is simple state in `App.tsx` (no router yet).

1. **Sign in / Sign up / Forgot password / Set new password** (`AuthScreen.tsx`)
   - Sign up: name ("What should we call you?"), email, password (min 8). With "Confirm email" off, the user goes straight in.
   - Friendly errors (wrong password, rate limits, no internet). The reset message is the same for every email (no account probing). Double-submit is blocked.
   - Detects the Supabase `PASSWORD_RECOVERY` event and shows "Choose a new password".
2. **Onboarding wizard** (`ProfileWizard.tsx`), shown on first login, 4 steps:
   - **About you:** name, occupation (required), age range, state (optional, all 36 states/UTs).
   - **Your money:** a box explaining why we ask, and "**We will never ask for your bank password, UPI PIN, OTP or card PIN.**" Income and expenses are required; savings, EMIs, dependents and emergency savings are optional.
     - Money fields are **dropdowns of exact round amounts** plus "**Other amount: type it**" (a typing box that keeps digits only).
     - Students see pocket-money amounts (₹500…₹20,000); others see salary amounts (₹10,000…₹2,00,000). Income includes "None (₹0)"; optional fields have "Prefer not to say".
     - A gentle non-blocking warning appears if expenses + savings + EMIs > income.
   - **Your goals:** checkboxes, plus free text for "Something else".
   - **Your comfort with money:** Beginner / Basic / Intermediate / Advanced, with a one-line hint each.
   - The same wizard is reused for **Edit my profile** (pre-filled; custom amounts reopen in the typing box).
3. **Home (temporary):** "Good morning/afternoon/evening, {name}.", a profile summary, buttons **My Money**, **Edit my profile**, **Sign out**. The real dashboard comes in Milestone 6.
4. **My Money** (`MoneyPage.tsx`):
   - Month switcher (‹ ›); can't go into the future.
   - Summary: Received / Spent / Left (or "Overspent" in red), "You kept X% of what you received", "You spent ₹X more/less than last month".
   - **+ Add entry** form: "I spent" / "I received", amount, category (changes with type), date (max today), description and notes (optional).
   - **Set/Edit budget:** a limit box per expense category (empty = no limit), with the total shown.
   - **Budget progress bars:** green (on track), amber (≥ 80%) or red (over), with "₹X left/over".
   - **Where your money went:** category, amount and share %.
   - **Entries list:** newest first, + for income and − for spending, **Edit** and **Delete** (asks "Delete this entry?" Yes/No).
   - Loading, empty and error states with **Try again**; slow answers for an old month are ignored.

Shared helpers: `rupees()` formats Indian style (₹1,50,000); `api()` adds the login token and turns failures into friendly `ApiError`s.

---

## 8. Tests (all passing at Milestone 4)

- **Backend: 120 tests.** Health and CORS (4); login token checks (11, including forged/unsigned/expired/wrong key/issuer/audience); profile API, validation and DB error mapping (30); money maths (35); money API, validation, privacy and request shape (40).
- **Frontend: 31 tests.** Auth screens (8), onboarding wizard (11), My Money page (9), helpers (3).
- **Live end-to-end checks** against the real Supabase were run for Milestones 2, 3 and 4 using temporary accounts (deleted afterwards): sign-up → profile auto-created; save/edit/reload profile; entries, budgets and summary maths correct; a second user cannot see, edit or delete the first user's data; no login → 401.
- Run locally:
  - Backend: `cd backend; .\.venv\Scripts\python -m pytest`
  - Frontend: `cd frontend; npm test` and `npm run build`

---

## 9. How to run locally (Windows, PowerShell)

```powershell
cd C:\Users\DELL\Desktop\Arthsaathi\backend; .\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```
```powershell
cd C:\Users\DELL\Desktop\Arthsaathi\frontend; npm run dev
```
Open http://localhost:5173. The Vite dev server forwards `/api` calls to port 8000.

---

## 10. Key decisions already made (do not change without asking)

1. Email + password login; email confirmation **off** for now; Google sign-in later.
2. Grok (xAI) free API for AI, behind a swappable interface, with per-user daily limits.
3. **All money maths in tested code, never AI.** AI only explains.
4. **Exact amounts, not ranges**, in dropdowns, so calculations never guess.
5. **Documents are optional** to upload (sensitive). Private, deletable, never used for training.
6. **Government schemes:** deep research from **official sources**, stored in **our own database** with source link and "last checked" date; the assistant answers from that data and shows sources; never claims confirmed eligibility.
7. Start with **one** AI assistant; add specialised parts only if clearly better.
8. **Unique UI** (no standard top navbar), built from the founder's templates.
9. Server uses the user's own token for database calls (RLS always applies); no service key unless truly required.
10. Legal: informational product; lawyer review before any public launch.

---

## 11. Known gaps and postponed items (see `docs/BEFORE_LAUNCH.md`)

- No custom domain or real email service yet. Turn "Confirm email" back on later; add Google sign-in later.
- Supabase "Leaked password protection" is off (may need a paid plan).
- **Account deletion is not built yet** (planned in the Settings milestone; it will need a secure server-side admin call).
- No rate limiting yet (planned with AI and hardening).
- The UI is plain and unbranded; no router, no landing/legal pages yet.
- Not deployed yet.
- A harmless test warning: Starlette suggests `httpx2` for its TestClient.

---

## 12. What comes next (agreed order)

1. **UI from templates:** the founder will share templates. Build a design system (colours, type, spacing, components) and restyle all existing screens with a **unique, non-top-navbar layout**, mobile-first and accessible.
2. **Deploy:** frontend on **Vercel**, backend on **Render**; set env vars there; add the live URLs to `CORS_ORIGINS` and to Supabase → Authentication → URL Configuration; check that CI is green.
3. **Milestone 5: Financial Goals:** name, target, saved, optional target date, priority, notes; progress %, remaining, monthly amount needed, estimated finish date (all in tested code).
4. **Milestone 6: Dashboard:** greeting, overview, goals, insights from real data only (with stated assumptions), 3–5 recommended actions, empty states, no fake numbers.
5. **Milestone 7: Ask ArthSaathi (AI):** Grok via the server, profile context with permission, conversation history, safety rules, Hindi/Hinglish, per-user limits, retry and error handling.
6. **Milestone 8:** public pages (landing, about, features, how it works, privacy, terms, disclaimer), settings, **account deletion**.
7. **Milestone 9:** hardening (security review, rate limits, monitoring, backups, performance).
8. **Later:** document understanding (optional uploads), financial learning, government schemes database, admin area.

---

## 13. Update: 26 November 2026 (after the first version of this document)

Sections 7, 11 and 12 above describe the plain, pre-design UI. Since then:

- **Live:** website on Vercel (`https://arthsaathi-ai.vercel.app`), server on Render (`https://arthsaathi-ai-tthi.onrender.com`). See `docs/DEPLOY.md`. Both redeploy when `main` changes. The server ignores a trailing `/` in `CORS_ORIGINS`.
- **Design:** charcoal theme with one orange accent (`frontend/src/index.css`, `src/ui/`). Green, yellow and red are used only for budget status and errors. Digits are tabular so amounts line up.
- **Landing page:** floating top bar, hero with a picture of the real dashboard (sample numbers, labelled), four working features with small pictures, an "On the way" list for unbuilt features, a live "Try it" 50/30/20 example, footer with legal links.
- **Pages have real addresses** (react-router): `/`, `/money`, `/profile`, `/profile/edit`, and public `/privacy`, `/terms`, `/disclaimer`. `frontend/vercel.json` rewrites app addresses to the app.
- **App layout:** left side panel on computers; top bar, 3-tab bottom bar and a round "Add entry" button on phones. The menu lists only built pages (Home, My Money, Profile). Goals and Ask ArthSaathi return to the menu when built.
- **Charts** are our own SVG (`src/ui/charts.tsx`): donut, smooth area chart with a month picker (hover, tap or Tab), sparkline.
- **New server endpoint:** `GET /api/money/trend?end=YYYY-MM&months=1..12`.
- **Legal pages** are plain-language first versions and are **not lawyer-reviewed**. A contact link shows only when `VITE_CONTACT_EMAIL` is set.
- **Dev-only previews with sample data:** `/#/design` (app) and `/#/design-onboarding`.
- **App polish:** add/edit entry and budget open as pop-ups (`src/ui/overlays.tsx`: bottom sheet on phones, centred on computers); a short confirmation appears after saving or deleting; amounts show Indian commas while typing and dates read "26 Nov 2026" (`src/ui/fields.tsx`); the entries list is grouped by day with a category icon per row and Edit/Delete behind an options button; loading shows placeholder shapes.
- **Milestone 5, Goals (27 Nov 2026):**
  - Table `public.goals` (migration `20261126000004_goals.sql`): `name` (1 to 80 chars), `target_amount` (> 0, up to ₹1,000 crore), `saved_amount`, optional `target_date`, optional `monthly_contribution`, `priority` (`high | medium | low`), `notes`; `user_id` defaults to `auth.uid()`; same four row-level-security policies as the other tables.
  - Maths in `backend/app/goals/calc.py` (plain code, 34 tests): to go, progress %, months left (each month after this one up to the target month, at least 1), suggested monthly amount (rounded up), months needed and estimated month at the user's own monthly amount, on track or not, overdue. Assumes the same saving every month and no interest; the page says so.
  - API: `GET /api/goals` (unfinished first by priority, reached last), `POST /api/goals`, `PUT /api/goals/{id}`, `DELETE /api/goals/{id}`. Every answer includes the calculated fields; calculated fields can't be sent in.
  - Website: `/goals` page (`frontend/src/goals/`): goal cards with progress bar and plan sentences, "Add money", edit/delete behind an options button, an empty state with one-tap common goals, pop-up forms. Goals is back in the menu and is a real feature tile on the landing page.
- **Tests:** backend 193, frontend 183.
- **Next:** Milestone 6 Dashboard (bring goals and insights onto Home), then Ask ArthSaathi.
