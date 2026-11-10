# SafeHer FastAPI backend

FastAPI backend for the SafeHer Next.js web prototype.

## Architecture

- Supabase Auth handles registration, sign-in, password reset and access-token issuance.
- FastAPI validates each bearer token by calling Supabase Auth `/auth/v1/user`.
- FastAPI calls Supabase PostgREST using the same user's access token and the public anon/publishable key.
- Because the user's JWT is forwarded, PostgreSQL Row Level Security policies are applied to database requests.
- The Supabase service-role key is not required and must never be placed in this project or the browser.

## 1. Run the database SQL first

Open Supabase Dashboard -> SQL Editor -> New query. Paste the complete `supabase/safeher_schema.sql` script and run it once.

The script creates profiles, appointments, credits, credit_transactions and privacy_settings, indexes, signup triggers and RLS policies.

## 2. Configure the backend

Python 3.11+ recommended.

```bash
python -m venv .venv
```

Activate it:

```bash
# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate
```

Install:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and set:

- `SUPABASE_URL`: Project URL from Supabase Project Settings -> API.
- `SUPABASE_ANON_KEY`: publishable/anon key from Supabase Project Settings -> API.
- `FRONTEND_ORIGINS`: your Next.js origin, normally `http://localhost:3000`.

Do not use the Supabase service-role/secret key.

## 3. Start FastAPI

```bash
uvicorn app.main:app --reload
```

- API health: http://127.0.0.1:8000/health
- Interactive API docs: http://127.0.0.1:8000/docs
- OpenAPI schema: http://127.0.0.1:8000/openapi.json

## 4. Authentication flow

The Next.js application should sign users in with Supabase Auth using `@supabase/supabase-js`. For each API call, send the current session access token:

```ts
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/me`, {
  headers: {
    Authorization: `Bearer ${session?.access_token}`,
  },
});
```

Never send a user's password to FastAPI. Supabase Auth owns password handling.

## 5. API endpoints

All endpoints except `/health`, `/support-services` and `/resources` require a valid Supabase access token.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/me` | Current profile |
| GET | `/api/v1/preferences` | Read privacy preferences |
| PATCH | `/api/v1/preferences` | Update privacy preferences |
| GET | `/api/v1/appointments` | List own appointments |
| POST | `/api/v1/appointments` | Request an appointment |
| POST | `/api/v1/appointments/{id}/cancel` | Cancel own pending/confirmed request |
| GET | `/api/v1/credits` | Read own sponsored credits |
| GET | `/api/v1/credits/transactions` | Read own credit history |
| GET | `/api/v1/support-services` | Public support service catalogue |
| GET | `/api/v1/resources` | Public resource catalogue |

## 6. Appointment and age pathway

The initial release only accepts appointment requests when `profiles.age_group = 'adult'`.
Accounts with `under_18` or `not_provided` are denied appointment creation by both FastAPI and the database insert policy.

New profiles default to `not_provided`. Set the test adult account's age group through a trusted administrative process before testing appointment creation. Do not treat a self-selected age value as verified age. A real launch needs an appropriate age-assurance and safeguarding design reviewed for the countries served.

The under-18 pathway in this MVP is informational only and does not collect appointment details.

## 7. Credits

The API is read-only for ordinary users. It does not let users deduct, allocate or edit credits. Credit changes must be performed by an authorized administrative or audited business workflow. `credit_transactions` provides a ledger for those changes.

Do not treat the old frontend's “Use LKR 500 demo credit” button as a real payment or credit-redemption workflow.

## 8. Frontend integration notes

The existing SafeHer frontend is currently a localStorage demo. It does not yet contain Supabase Auth or calls to these endpoints.

Add the frontend environment variable:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Then replace the demo state handlers in `components/safeher-app.tsx` with API calls and map API values:

- API format `online` -> UI label `Online`
- API format `in_person` -> UI label `In person`
- API statuses `requested`, `confirmed`, `completed`, `cancelled` -> title-case labels
- API `starts_at` -> local date/time display

The frontend booking form currently collects date and time separately. Convert the selected local date/time to an ISO timestamp with timezone before sending `starts_at`.

## 9. Production checklist

Before real users or sensitive information:

- Use HTTPS for frontend and API.
- Configure production CORS origins exactly; do not use `*`.
- Add rate limiting, monitoring, backups and alerting.
- Add an audited staff/admin role and workflows.
- Review age assurance, consent, safeguarding and escalation.
- Complete a privacy impact assessment and retention/deletion policy.
- Review professional verification and appointment availability workflows.
- Add automated tests and deployment secrets management.
- Do not log access tokens, passwords, case details or sensitive request bodies.
- Run security testing before launch.

This is a secure-by-default MVP foundation, not a completed clinical, legal, crisis-response or safeguarding system.
