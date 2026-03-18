# SchoolOS Integration Tests

Playwright E2E tests targeting the live Docker stack.

## Prerequisites

The full stack must be running:
```bash
docker compose up --build
```

Services needed:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Keycloak: http://localhost:8180

## Setup

```bash
cd integration-tests
npm install
npx playwright install chromium
```

## Run Tests

```bash
# Headless (CI)
npm test

# Headed (watch mode)
npm run test:headed

# Interactive UI
npm run test:ui

# View last report
npm run test:report
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:5173` | Frontend URL |
| `KEYCLOAK_URL` | `http://localhost:8180` | Keycloak URL |
| `ADMIN_EMAIL` | `admin@school.com` | Admin credentials |
| `ADMIN_PASSWORD` | `Admin@123` | Admin password |

## Test Structure

```
tests/
  auth.setup.ts     — Login once, saves storageState to fixtures/auth.json
  auth.spec.ts      — Login/logout flows
  students.spec.ts  — Student list, detail, Fees tab
  fees.spec.ts      — Fee calculator (grade + per-student), collect fee, ledger
  payments.spec.ts  — Payment history list
  slc.spec.ts       — SLC list, lookup, issue
fixtures/
  auth.ts           — Reusable login fixture
  auth.json         — Generated auth state (git-ignored)
```
