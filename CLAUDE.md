# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SchoolOS is an AI-powered K-12 School Operations Platform targeting Indian schools. It handles student management, fee collection, SLC (School Leaving Certificate) generation, teacher salary, govt circular OCR, and a daily digest system. Designed for multi-tenancy so one backend serves multiple schools.

---

## Commands

### Backend (`schoolos-backend/`)
```bash
# Run locally (requires Postgres + Keycloak running)
./mvnw spring-boot:run

# Run all tests
./mvnw test

# Regenerate JOOQ classes from schema (requires Docker for Testcontainers)
./mvnw generate-sources

# Build JAR
./mvnw package -DskipTests
```

### Frontend (`schoolos-frontend/`)
```bash
npm install
npm run dev       # Dev server at http://localhost:5173
npm run lint      # ESLint (0 warnings allowed)
npm run build     # Production build
```

### Full Stack (Docker Compose)
```bash
docker compose up --build
# Services: Postgres :5432, Keycloak :8180, Backend :8080, Frontend :5173
```

### Key Local URLs
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Keycloak Admin: `http://localhost:8180` (admin / admin)

### Demo Credentials (schoolos realm)
- **Email:** `admin@school.com` **Password:** `Admin@123` **Role:** ADMIN
- School: Demo School (id `00000000-0000-0000-0000-000000000001`)

---

## Architecture

### Tech Stack
- **Backend**: Java 21, Spring Boot 3.3, JOOQ 3.19, PostgreSQL 16, Keycloak 24 (IAM)
- **Frontend**: React 18, Vite, TailwindCSS 3, React Query v5, React Hook Form + Zod, Keycloak-js
- **PDF Generation**: iText 8 (SLC PDFs, payment receipts)
- **AI/OCR**: Fallback chain — Ollama (local `qwen2-vl`) → Gemini → Claude
- **Email**: Spring Mail (daily digest)

### Multi-Tenancy
Every request carries a `school_id` claim in the Keycloak JWT. `TenantFilter` (`common/TenantFilter.java`) extracts this and sets it on `TenantContext` (thread-local). All service methods read `TenantContext.get()` to scope queries to the current school. The DB enforces this via `school_id` columns on every root table.

### Authentication & Authorization
- Keycloak 24 is the only IdP. The backend is a stateless OAuth2 resource server.
- `KeycloakJwtConverter` extracts roles from `realm_access.roles` and prefixes them with `ROLE_` for Spring Security.
- Roles: `ADMIN`, `ACCOUNTANT`, `PARENT`. Route guards in `App.jsx` use `PrivateRoute` with a `roles` prop.
- One public endpoint: `POST /api/v1/admissions/inquire` (no token required for parent inquiry form).

### API Response Envelope
All REST responses use `ApiResponse<T>` (`common/ApiResponse.java`):
```json
{ "success": true, "data": {...} }
{ "success": true, "data": [...], "pagination": { "page": 0, "size": 20, "total": 100 } }
{ "success": false, "error": { "code": "ERR_CODE", "message": "..." } }
```
The Axios client (`api/axiosClient.js`) unwraps this envelope transparently — callers receive `data` directly.

### Database
- UUID primary keys everywhere; soft-delete via `deleted_at` (never hard-delete).
- Schema is idempotent (`CREATE TABLE IF NOT EXISTS`) and auto-applied at startup via `schema.sql` + `data.sql`.
- JOOQ classes are generated at build time using Testcontainers (spins up a real Postgres from `schema.sql`). Generated classes land in `target/generated-sources/jooq` under package `com.schoolos.jooq`.
- After changing `schema.sql`, run `./mvnw generate-sources` to regenerate JOOQ classes.

### Backend Domain Packages
Each feature is a self-contained package under `com.schoolos`:
- `school` — schools, calendar years, classes, sections
- `student` — students, enrollments, guardians, admissions
- `teacher` — teachers, salary payments
- `fee` — fee configs, breakdown items, discounts, late-fee rules, invoices
- `payment` — payments, UPI OCR, receipt PDF
- `slc` — school leaving certificates, PDF generation
- `govtocr` — govt circular upload + AI OCR
- `digest` — daily digest scheduling, email delivery
- `users` — Keycloak user sync
- `ai` — vision provider chain (Ollama/Gemini/Claude)
- `common` — `ApiResponse`, `TenantContext`, `TenantFilter`, `StorageService`, `GlobalExceptionHandler`
- `config` — security, JOOQ, CORS, JWT converter, OpenAPI

### AI Vision / OCR
`VisionProviderChain` tries providers in order: Ollama → Gemini → Claude. Each provider implements `VisionProvider`. A provider is skipped if `isAvailable()` returns false (based on config). Used by `UpiOcrService` (parse UPI screenshots) and `CircularOcrService` (parse govt circulars).

### File Storage
`StorageService` writes files to local disk at `${app.upload-dir}` (default `/uploads`). Files are served as static content at `/uploads/**`. In Docker the volume is `uploads_data:/uploads`.

### Frontend API Layer
`src/api/` has one file per domain (e.g. `fees.js`, `students.js`). All calls go through `axiosClient` which:
1. Attaches the Keycloak Bearer token (auto-refreshed if expiring within 30s).
2. Sets `Accept-Language` header from `localStorage` key `schoolos-lang`.
3. Unwraps the `ApiResponse` envelope on success; rejects with a typed error on failure.

### i18n
- Backend: `messages.properties` / `messages_hi.properties` / `messages_gu.properties` for localized error messages returned via `Accept-Language`.
- Frontend: `react-i18next` with `i18next-http-backend`. Language preference stored in `localStorage` as `schoolos-lang`.

---

## Environment Variables (Backend)

| Variable | Default | Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/schoolos` | Postgres connection |
| `KEYCLOAK_JWK_URI` | `http://localhost:8180/realms/schoolos/...` | JWT validation endpoint |
| `KEYCLOAK_SERVER_URL` | `http://localhost:8180` | Admin API base |
| `KEYCLOAK_ADMIN_CLIENT_ID` | `schoolos-backend` | Service account client |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | `schoolos-backend-secret` | Service account secret |
| `UPLOAD_DIR` | `/uploads` | Local file storage root |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API |
| `OLLAMA_VISION_MODEL` | `qwen2-vl` | Vision model name |
| `OLLAMA_ENABLED` | `true` | Enable/disable Ollama |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini key |
| `ANTHROPIC_API_KEY` | _(empty)_ | Anthropic Claude key |
| `MAIL_HOST` / `MAIL_PORT` | `localhost` / `1025` | SMTP (Mailhog in dev) |
