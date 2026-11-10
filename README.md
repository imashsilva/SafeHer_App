# SafeHer

**A privacy-conscious support and complaint-management prototype for Sri Lanka.**

SafeHer is a web application designed to help people explore support pathways, browse introductory resources, and use authenticated features such as complaint category requests and appointment requests. It is built with **Next.js**, **FastAPI**, and **Supabase**.

> [!IMPORTANT]
> **Prototype / staging use only.** SafeHer is **not** currently a staffed complaint-reporting, emergency-response, legal-advice, or appointment-booking service. Do not submit real incident descriptions, names, contact details, or other sensitive case information. Use fictional test data only. A public-facing, real-world service requires additional security, privacy, safeguarding, operational, and legal review.

## Features

- **Public browsing:** View the homepage, support pathways, and resource library without signing in.
- **Authentication:** Sign up, sign in, and sign out using Supabase Auth.
- **Complaint requests (Phase 3):** Eligible authenticated test accounts can select a complaint category, add a short *fictional demonstration note*, view saved requests, and edit requests when their status allows it.
- **Appointment requests (Phase 4):** Eligible authenticated test accounts can create, view, and cancel requests. **Requests do not confirm a booking or notify a professional.**
- **Sponsored credits:** View database-backed balances. These are illustrative; there is no real redemption or payment flow.
- **Privacy preferences:** Store supported account preferences through the backend.
- **Dashboard:** Show account-specific information from the backend.
- **Language selector:** English, Sinhala, and Tamil interface options (translation coverage may be incomplete).
- **Quick Exit:** A button to leave the application quickly. **It does not erase browser history or other traces of activity.**
- **Safeguarding:** Under-18 and unverified accounts are not permitted to use adult complaint and appointment submission flows in this prototype.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React, TypeScript, CSS, Lucide icons |
| Backend | Python, FastAPI, Uvicorn |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Database access control | PostgreSQL Row Level Security (RLS) and backend authorization |
| Source control | Git and GitHub |
| Frontend hosting | Vercel |
| Backend hosting | Render |

## Repository structure

```text
SafeHer-2/
├── README.md                         # This file
├── .gitignore
├── safeher-frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth-gate.tsx
│   │   ├── brand.tsx
│   │   └── safeher-app.tsx
│   ├── lib/
│   │   ├── api.ts
│   │   ├── demo-data.ts
│   │   ├── supabase.ts
│   │   ├── types.ts
│   │   └── ui-language.ts
│   ├── .env.local                     # Local only; never commit
│   └── package.json
└── safeher-backend/
    ├── app/
    │   ├── main.py
    │   ├── api/
    │   ├── core/
    │   ├── schemas/
    │   └── data/
    ├── supabase/
    │   ├── safeher_schema.sql
    │   ├── phase3_complaints.sql
    │   └── phase3_demo_notes_edit.sql
    ├── tools/                         # Environment diagnostics, if installed
    ├── .env                           # Local only; never commit
    └── requirements.txt
```

The structure above reflects the SafeHer project and Phase 3–4 patches. Some optional test or utility files may differ between installations.

## Requirements

- Node.js and npm compatible with the project's Next.js version
- Python 3.10+ and `pip` (use a version supported by the project's dependencies)
- A Supabase project
- Git
- Optional for deployment: GitHub, Vercel, and Render accounts

## Local development

### 1. Clone the repository

```powershell
git clone https://github.com/YOUR_USERNAME/SafeHer-2.git
cd SafeHer-2
```

If you already have the project at `G:\SafeHer-2`, open that folder instead of cloning it again.

### 2. Configure Supabase

Create a project in [Supabase](https://supabase.com/). In its **SQL Editor**, apply the migrations needed for your installation in this order:

1. `safeher-backend/supabase/safeher_schema.sql` — base tables and policies.
2. `safeher-backend/supabase/phase3_complaints.sql` — complaint requests.
3. `safeher-backend/supabase/phase3_demo_notes_edit.sql` — fictional demo notes and editing support.

**Existing database?** Do not rerun migrations blindly. Check which tables and columns already exist, back up the database, and apply only missing changes.

In Supabase **Authentication**, configure the intended sign-in providers and URL settings. Keep Row Level Security enabled on private tables.

### 3. Configure the frontend

Create `safeher-frontend/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Then install and start the frontend:

```powershell
cd safeher-frontend
npm install
npm run dev
```

Frontend: <http://localhost:3000>

### 4. Configure the backend

In a **separate terminal**, from the repository root:

```powershell
cd safeher-backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `safeher-backend/.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
FRONTEND_ORIGINS=http://localhost:3000
ENVIRONMENT=development
API_PREFIX=/api/v1
```

Start FastAPI:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend health: <http://127.0.0.1:8000/health>  
Interactive API documentation: <http://127.0.0.1:8000/docs>

> The frontend and backend must point to the **same Supabase project**. Do not expose private service-role or secret keys in `NEXT_PUBLIC_` environment variables.

## Main API endpoints

The exact route set depends on the installed Phase 3–4 backend version.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Backend health check |
| GET | `/api/v1/me` | Authenticated profile and eligibility |
| GET | `/api/v1/complaints` | List the signed-in user's complaint requests |
| POST | `/api/v1/complaints` | Create an eligible category/demo-note request |
| PATCH | `/api/v1/complaints/{id}` | Edit a request when permitted by its status |
| GET | `/api/v1/appointments` | List appointment requests |
| POST | `/api/v1/appointments` | Create an eligible appointment request |
| POST | `/api/v1/appointments/{id}/cancel` | Cancel a request |
| GET | `/api/v1/credits` | View credit balances |
| GET | `/api/v1/credits/transactions` | View credit transactions, if present |
| GET | `/api/v1/preferences` | Read privacy preferences |
| PATCH | `/api/v1/preferences` | Update privacy preferences |
| GET | `/api/v1/support-services` | Support service directory |
| GET | `/api/v1/resources` | Resource directory |

Protected endpoints require a valid Supabase access token. Verify the actual paths in `/docs` after starting the backend.

## Deploy to GitHub, Render, and Vercel

Deploy a **staging instance with fictional data only** until the application has passed a security and safeguarding review.

### 1. Push the repository to GitHub

Create a **private** GitHub repository. At the repository root, ensure `.gitignore` excludes secrets and generated files:

```gitignore
.env
.env.*
!.env.example
!.env.*.example
node_modules/
.next/
.vercel/
.venv/
venv/
__pycache__/
*.pyc
.pytest_cache/
*.log
```

Review staged files before committing:

```powershell
git init
git add .
git diff --cached --name-only
git commit -m "Initial SafeHer application"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/SafeHer-2.git
git push -u origin main
```

If the repository is already initialized or has a remote, use `git status` and `git remote -v` before changing Git settings. If a secret was previously committed, removing the file from the latest commit is **not sufficient**; rotate the credential and remove it from Git history.

### 2. Deploy FastAPI on Render

Create a **Web Service** connected to the GitHub repository:

| Render setting | Value |
| --- | --- |
| Root directory | `safeher-backend` |
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Add backend environment variables in Render's dashboard (not in Git):

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
FRONTEND_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app
ENVIRONMENT=development
API_PREFIX=/api/v1
```

`ENVIRONMENT=development` is shown for compatibility with the current staging prototype; do **not** treat that setting as production hardening. Review the backend's configuration before switching to a production environment.

After deployment, check `https://YOUR_RENDER_DOMAIN.onrender.com/health` and review Render logs for errors.

### 3. Deploy Next.js on Vercel

Import the same GitHub repository into Vercel:

| Vercel setting | Value |
| --- | --- |
| Framework | Next.js |
| Root directory | `safeher-frontend` |
| Build command | `npm run build` |
| Output directory | Framework default |

Configure the frontend environment variables in Vercel:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
NEXT_PUBLIC_API_BASE_URL=https://YOUR_RENDER_DOMAIN.onrender.com/api/v1
```

Deploy, then record the assigned Vercel URL.

### 4. Connect the deployed services

1. Update `FRONTEND_ORIGINS` in Render to the **exact Vercel origin** (no trailing slash or path), then redeploy/restart if needed.
2. In Supabase **Authentication → URL Configuration**, set the site URL and allow the intended Vercel authentication redirect URL(s).
3. Confirm that Vercel's `NEXT_PUBLIC_API_BASE_URL` uses the **HTTPS** Render URL and ends with `/api/v1`.
4. Sign out and back in to test a fresh authenticated session.
5. Avoid using unrestricted production redirect wildcards when exact URLs are available.

### 5. Staging deployment checks

- [ ] GitHub repository contains no `.env` or `.env.local` files.
- [ ] Render `/health` responds successfully.
- [ ] Vercel homepage loads without signing in.
- [ ] Sign up, email confirmation (if enabled), sign in, and sign out work.
- [ ] Authenticated `/api/v1/me` returns HTTP 200.
- [ ] Complaint category and fictional demo note can be submitted and edited by an eligible test account.
- [ ] Complaint requests persist after refresh and cannot be read by another test account.
- [ ] Appointment requests save to Supabase and can be cancelled.
- [ ] Privacy settings persist after refresh.
- [ ] Credit balances display correctly, including the empty state.
- [ ] Under-18 and unverified accounts cannot submit adult complaint or appointment requests.
- [ ] Mobile layout, language selector, and Quick Exit work.
- [ ] No access tokens or sensitive personal information appear in application logs, screenshots, or test fixtures.

## Testing and troubleshooting

### Frontend build

```powershell
cd safeher-frontend
npm run build
```

### Backend tests

From `safeher-backend`, run the project's installed test suite if available:

```powershell
.\.venv\Scripts\python.exe -m pytest
```

If `pytest` is not installed, use the test dependencies defined by your backend setup; do not assume every project copy includes the same tests.

### Common issues

| Problem | What to check |
| --- | --- |
| `/api/v1/me` returns 401 | Supabase project URL, valid session, token verification, and backend logs |
| Browser reports CORS error | Render `FRONTEND_ORIGINS` must include the exact Vercel origin |
| Login confirmation redirects to localhost | Supabase Authentication URL Configuration |
| Vercel cannot reach FastAPI | HTTPS Render URL and `/api/v1` in `NEXT_PUBLIC_API_BASE_URL` |
| Complaint submission is blocked | Authenticated account eligibility and backend response; never bypass safeguarding |
| SQL column or table is missing | Apply only the required migration after backing up the database |
| Render first request is slow | Check service plan, startup state, and logs |

## Privacy, safeguarding, and production limitations

SafeHer's current implementation is a **technical prototype**, not a production-ready support service. Before accepting real complaints or offering real appointments, the project needs at least:

- A documented privacy notice, data-retention policy, consent approach, and deletion process.
- A reviewed safeguarding design, including an appropriate pathway for people under 18.
- Verified professionals and staff roles, secure case assignment, and escalation procedures.
- Strong authorization checks and RLS review for **every** private read and write.
- Security testing, rate limiting, abuse prevention, monitoring, backup and recovery plans.
- A secure workflow for handling sensitive case information; do not rely on browser `localStorage` for it.
- Operational procedures for requests, response times, and emergency referrals.
- Accessibility, localization, and legal review appropriate to the service's intended users and jurisdiction.

**Quick Exit is not a privacy eraser.** It navigates away but cannot guarantee removal of browser history, network records, or device traces.

## Development status

| Phase | Status |
| --- | --- |
| Phase 1 — Frontend and public browsing | Implemented in prototype |
| Phase 2 — Authentication and base backend | Implemented in prototype |
| Phase 3 — Complaint category requests and editing | Locally tested with fictional data |
| Phase 4 — Appointments, credits, preferences, and dashboard integration | Locally implemented; staging verification recommended |
| Phase 5 — GitHub and cloud deployment | In progress |

## Contributing

This is a developing project. Before contributing, open an issue or discuss the change with the project maintainer. Do not include actual complaint records, credentials, or personal information in issues, pull requests, screenshots, or test fixtures.

## License

**No license has been selected yet.** Until a license file is added, do not assume that the source code is available for unrestricted reuse or redistribution.

---

**SafeHer — Support, choice, and dignity.**
