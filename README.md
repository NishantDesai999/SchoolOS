# SchoolOS

Multi-tenant K-12 school operations platform.

## Quick Start

### Prerequisites
- Docker Desktop (running)
- Maven (Java 21+)

### Run the stack

```bash
# 1. Build the backend JAR (required before Docker build)
cd schoolos-backend
mvn clean package -DskipTests
cd ..

# 2. Start all services
docker compose up --build -d
```

Wait ~60s for Keycloak to initialize on first run.

---

## Service URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Keycloak Admin Console | http://localhost:8180 |

---

## Credentials

### SchoolOS App (schoolos realm)
| Field | Value |
|---|---|
| URL | http://localhost:5173 |
| Email | admin@school.com |
| Password | Admin@123 |
| School ID | 00000000-0000-0000-0000-000000000001 |

### Keycloak Admin Console (master realm)
| Field | Value |
|---|---|
| URL | http://localhost:8180 |
| Username | admin |
| Password | admin |
| Realm to manage | schoolos |

---

## Database Connections (DBeaver / psql)

### App Database
| Field | Value |
|---|---|
| Host | localhost |
| Port | 5432 |
| Database | schoolos |
| Username | schoolos |
| Password | schoolos_secret |

### Keycloak Database
| Field | Value |
|---|---|
| Host | localhost |
| Port | 5433 |
| Database | keycloak |
| Username | keycloak |
| Password | keycloak_secret |

---

## Tech Stack

- **Backend**: Spring Boot 3.3, Java 21, JOOQ 3.19, PostgreSQL 16
- **Auth**: Keycloak 24 (JWT, `realm_access.roles`, `school_id` claim)
- **Frontend**: React 18, Vite, TailwindCSS, TanStack Query v5, React Hook Form + Zod
