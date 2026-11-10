# SafeHer — Next.js frontend prototype

A responsive, frontend-only SafeHer prototype built with **Next.js App Router, React 19 and TypeScript**. It is designed for laptop, desktop, tablet and mobile web browsers.

## Included screens

- Overview dashboard
- Find support (legal, psychosocial and community pathways)
- Appointment request form and appointment list
- Sponsored support credits
- Searchable resource library
- Privacy preferences and demo-data reset
- Separate under-18 information panel (no appointment collection)
- Responsive sidebar/mobile navigation

## Important prototype limitations

This is a **frontend demonstration**, not a production service. Data is stored in browser `localStorage` on the current device. There is no real authentication, backend API, provider availability, professional assignment, payment, messaging, video call, safeguarding workflow or secure case management. Do not enter real or sensitive personal information. The sample appointment records and credit balances are illustrative.

The pink floral brand mark is an editable vector placeholder. Replace it with the approved DURGAWO/SafeHer logo asset when that file is available in the development workspace.

## Requirements

- Node.js 20.9 or later
- npm 10+ recommended

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build check

```bash
npm run build
npm start
```

## Connect FastAPI later

Set `NEXT_PUBLIC_API_BASE_URL` in `.env.local`, then replace the local state functions in `components/safeher-app.tsx` with a typed API client. Keep all authorization and sensitive business rules on the FastAPI server. Do not expose Supabase service-role keys in frontend code.

Suggested future API boundaries:

- `GET /api/v1/me`
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `PATCH /api/v1/appointments/{id}`
- `GET /api/v1/support-services`
- `GET /api/v1/credits`
- `GET /api/v1/resources`
- `GET/PATCH /api/v1/preferences`

## Brand palette

- Deep burgundy: `#5B1835`
- Dusty rose: `#D7A0AD`
- Copper: `#B97858`
- Rose mist: `#F6E9EC`
- Warm canvas: `#FCFAFB`

## Folder structure

```text
safeher-nextjs-frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── brand.tsx
│   └── safeher-app.tsx
├── lib/
│   ├── demo-data.ts
│   └── types.ts
├── public/
├── .env.example
├── .gitignore
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── README.md
└── tsconfig.json
```
