# Auth0 Authentication System — Hono Server

A production-ready, ultra-fast Hono backend for the Auth0 Authentication System platform running on Node.js 26 Active LTS.

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 26.x LTS | Runtime environment |
| TypeScript | ^7.0 | Type-safe development |
| Hono | ^4.7 | Lightweight, ultrafast Web Standards HTTP framework |
| @hono/node-server | ^1.13 | High-performance Node.js adapter for Hono |
| PostgreSQL | 18 | Relational database |
| Prisma | ^7.10 | Type-safe ORM & migrations with `@prisma/adapter-pg` |
| jose | ^6.2 | Asymmetric JWT & JWKS cryptographic verification |
| Pino | ^10.4 | Structured logging with redaction |
| Zod | ^4.6 | Schema & environment validation |
| ESLint | ^9.21 | Flat configuration static code analysis |
| Prettier | ^3.5 | Code formatting |

## Prerequisites

- **Node.js** ≥ 26.0.0
- **npm** ≥ 12.x
- **PostgreSQL** 18 running and accessible
- **Auth0 account** with a configured tenant and API

## Directory Structure

```text
hono-server/
│
├── prisma/
│   ├── schema.prisma           # Prisma models (ApplicationUser, Role, Permission, UserRole, RolePermission)
│   └── migrations/             # Database migrations
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment configuration
│   │   ├── database.config.ts  # Database connection pool configuration
│   │   ├── logger.config.ts    # Pino configuration with redaction
│   │   ├── auth0.config.ts     # Auth0 domain, audience & algorithm configuration
│   │   └── app.config.ts       # Centralized application configuration
│   │
│   ├── common/
│   │   ├── constants/          # HTTP status constants
│   │   ├── enums/              # Error codes and shared enumerations
│   │   ├── interfaces/         # API response type definitions
│   │   ├── types/              # Common domain types
│   │   └── utils/              # AppError class and response formatting helpers
│   │
│   ├── database/
│   │   ├── prisma.client.ts    # Singleton Prisma client with PostgreSQL adapter pool
│   │   └── database.service.ts # Connection lifecycle and health checks
│   │
│   ├── integrations/
│   │   └── auth0/
│   │       ├── auth0.constants.ts    # Header names and JWKS timing constants
│   │       ├── auth0.types.ts        # AuthenticatedUser and verification result types
│   │       ├── auth0.client.ts       # jose createRemoteJWKSet with auto-rotation
│   │       ├── auth0.claim-mapper.ts # Claim extraction (scopes, permissions, roles)
│   │       ├── auth0.verifier.ts     # Asymmetric JWT verification and error mapping
│   │       └── auth0.module.ts       # Barrel exports
│   │
│   ├── middlewares/
│   │   ├── request-id.middleware.ts    # X-Request-ID propagation
│   │   ├── error-handler.middleware.ts # Centralized exception and 404 handler
│   │   └── auth.middleware.ts          # authenticate & optionalAuthenticate middleware
│   │
│   ├── modules/
│   │   ├── health/
│   │   │   ├── health.types.ts
│   │   │   ├── health.service.ts
│   │   │   ├── health.controller.ts
│   │   │   └── health.routes.ts
│   │   │
│   │   └── auth/
│   │       ├── auth.types.ts         # /me and /status DTOs
│   │       ├── auth.service.ts       # Auth business logic
│   │       ├── auth.controller.ts    # Route handlers
│   │       └── auth.routes.ts        # Auth routes (/me, /status)
│   │
│   ├── services/
│   │   └── logger.service.ts   # Singleton Pino logger
│   │
│   ├── app.ts                  # Hono app factory (createApp)
│   └── server.ts               # Server bootstrap, listen & graceful shutdown
│
├── docs/
│   ├── architecture.md         # Architecture and phase roadmap
│   └── auth0-integration.md    # Auth0 token verification and frontend contract
│
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore rules
├── eslint.config.js            # ESLint flat configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.build.json         # TypeScript production build configuration
├── package.json                # Project metadata and scripts
└── README.md                   # This file
```

---

## API Overview

| Resource | Method | Endpoint | Protection |
|---|---|---|---|
| **Health** | `GET` | `/health` (also `/api/v1/health`) | Public |
| **Health Liveness** | `GET` | `/health/live` (also `/live`) | Public |
| **Health Readiness**| `GET` | `/health/ready` (also `/ready`) | Public |
| **Auth** | `GET` | `/api/v1/auth/status` | Public |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated |

---

## Implementation Status

### ✅ Phase 1 — Foundation & Architecture
- Hono 4 application foundation with `@hono/node-server`
- TypeScript strict configuration (ESM `NodeNext`)
- Zod-validated environment configuration
- Pino structured logging with credential redaction
- Prisma 7 with PostgreSQL 18 driver adapter (`@prisma/adapter-pg`)
- Centralized error handling (`app.onError`) and not-found handler (`app.notFound`)
- Request correlation ID middleware (`X-Request-ID`)
- Health check module (`/health`, `/health/live`, `/health/ready`)
- Graceful shutdown for HTTP server and database pool

### ✅ Phase 2 — Auth0 Integration & Authentication Architecture (Current)
- Auth0 JWT access token verification via `jose` v6
- Asymmetric signature validation using Auth0 remote JWKS
- Dynamic key caching, key rotation, and cooldown management
- Hono authentication middleware: `authenticate` (mandatory) and `optionalAuthenticate`
- Context decoration with `c.set('auth', user)`
- Claim extraction: scopes, Auth0 RBAC permissions, and namespaced custom roles
- Auth module with `/api/v1/auth/me` and `/api/v1/auth/status` endpoints
- Authentication error handling mapping token expiry, audience/issuer mismatches, and format errors
- Complete Auth0 integration guide and frontend client contract (`docs/auth0-integration.md`)

### 🔲 Phase 3 — Authorization, RBAC & User Management (Planned)
### 🔲 Phase 4 — Production-Ready Capabilities & Infrastructure (Planned)
### 🔲 Phase 5 — Final Integration & Test Implementation (Planned)

---

**Current Progress: 2/5 phases completed | 3/5 remaining**
