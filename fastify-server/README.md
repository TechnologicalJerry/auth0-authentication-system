# Auth0 Authentication System — Fastify Server

A production-ready, high-performance Fastify backend for the Auth0 Authentication System platform.

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 26.x LTS | Runtime environment |
| TypeScript | ^7.0 | Type-safe development |
| Fastify | ^5.2 | High-performance asynchronous HTTP framework |
| PostgreSQL | 18 | Relational database |
| Prisma | ^7.10 | Type-safe ORM & migrations with `@prisma/adapter-pg` |
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
fastify-server/
│
├── prisma/
│   ├── schema.prisma           # Prisma models (PostgreSQL 18)
│   └── migrations/             # Database migrations
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment configuration
│   │   ├── database.config.ts  # Database connection pool configuration
│   │   ├── logger.config.ts    # Pino configuration with redaction
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
│   ├── plugins/
│   │   ├── request-id.plugin.ts    # X-Request-ID propagation
│   │   └── error-handler.plugin.ts # Centralized exception and 404 handler
│   │
│   ├── modules/
│   │   └── health/
│   │       ├── health.types.ts
│   │       ├── health.service.ts
│   │       ├── health.controller.ts
│   │       └── health.routes.ts
│   │
│   ├── services/
│   │   └── logger.service.ts   # Singleton Pino logger
│   │
│   ├── app.ts                  # Fastify app factory (buildApp)
│   └── server.ts               # Server bootstrap, listen & graceful shutdown
│
├── docs/
│   └── architecture.md         # Architecture and phase roadmap
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

## API Overview (Phase 1)

| Resource | Method | Endpoint | Protection |
|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | Public |
| **Health Liveness** | `GET` | `/api/v1/health/live` | Public |
| **Health Readiness**| `GET` | `/api/v1/health/ready` | Public |

---

## Implementation Status

### ✅ Phase 1 — Foundation & Architecture (Current)
- Fastify 5 application foundation with plugin architecture
- TypeScript strict configuration (ESM `NodeNext`)
- Zod-validated environment configuration
- Pino structured logging with redaction
- Prisma 7 with PostgreSQL 18 driver adapter (`@prisma/adapter-pg`)
- Centralized error handling plugin and 404 handler
- Request correlation ID plugin (`X-Request-ID`)
- Health check module (`/health`, `/health/live`, `/health/ready`)
- Graceful shutdown for HTTP server and database pool

### 🔲 Phase 2 — Auth0 Integration (Planned)
### 🔲 Phase 3 — Authorization, RBAC & User Management (Planned)
### 🔲 Phase 4 — Production-Ready Capabilities & Infrastructure (Planned)
### 🔲 Phase 5 — Final Integration & Test Implementation (Planned)

---

**Current Progress: 1/5 phases completed | 4/5 remaining**

