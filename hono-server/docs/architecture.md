# Hono Server Architecture Specification

## 1. Overview

`hono-server` is an ultra-fast, lightweight, enterprise-grade backend for the `auth0-authentication-system` platform built on **Hono 4** and **Node.js 26 Active LTS** via `@hono/node-server`.

It faithfully mirrors the domain model, database schema, security posture, and role-based access control established in `express-server` and `fastify-server`, while leveraging Hono's minimalist, standard-compliant Web Standards-based routing and middleware architecture.

---

## 2. Technology Stack

- **Runtime**: Node.js 26.x Active LTS
- **Language**: TypeScript 7.x (ESM `NodeNext`)
- **HTTP Framework**: Hono 4.x
- **Node.js Server Adapter**: `@hono/node-server` 1.x
- **Database**: PostgreSQL 18
- **ORM**: Prisma 7.x with `@prisma/adapter-pg` driver adapter
- **Configuration & Validation**: Zod 4.x
- **Logging**: Pino 10.x with sensitive field redaction
- **Linting & Formatting**: ESLint 9 (flat config) & Prettier 3

---

## 3. Directory Layout

```text
hono-server/
│
├── prisma/
│   ├── schema.prisma           # Prisma models (PostgreSQL 18)
│   └── migrations/             # Database migrations
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Environment schema validation with Zod
│   │   ├── database.config.ts  # Database connection pool configuration
│   │   ├── logger.config.ts    # Pino configuration and sensitive field redaction
│   │   └── app.config.ts       # Centralized application configuration
│   │
│   ├── common/
│   │   ├── constants/          # HTTP status constants
│   │   ├── enums/              # Error codes and shared enumerations
│   │   ├── interfaces/         # Standard API response interfaces
│   │   ├── types/              # Common domain types
│   │   └── utils/              # AppError class and response formatting helpers
│   │
│   ├── database/
│   │   ├── prisma.client.ts    # Singleton PrismaClient with PostgreSQL adapter pool
│   │   └── database.service.ts # Connection lifecycle and health checks
│   │
│   ├── middlewares/
│   │   ├── request-id.middleware.ts    # X-Request-ID propagation
│   │   └── error-handler.middleware.ts # Centralized exception and 404 handler
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
│   ├── app.ts                  # Hono application factory (createApp)
│   └── server.ts               # Server bootstrap, listen & graceful shutdown
│
├── docs/
│   └── architecture.md         # This specification
│
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore rules
├── eslint.config.js            # ESLint flat configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.build.json         # TypeScript production build configuration
├── package.json                # Project metadata and scripts
└── README.md                   # Project documentation
```

---

## 4. Phase Rollout Roadmap

1. **Phase 1: Foundation & Architecture** (Current)
   - Hono application foundation with Web Standards routing
   - Strict TypeScript configuration (`NodeNext`)
   - Zod environment configuration validation
   - Pino structured logging with credential redaction
   - Prisma 7 with PostgreSQL 18 adapter pool
   - Request correlation ID and centralized error handling
   - Comprehensive health check module (`/health`, `/health/live`, `/health/ready`)
   - Graceful shutdown orchestration for HTTP server and database pool

2. **Phase 2: Auth0 Integration & Authentication Architecture** (Planned)
   - Asymmetric JWT verification against Auth0 JWKS using `jose` v6
   - Dynamic key rotation and remote JWKS caching
   - Hono authentication middleware (`authenticate`, `optionalAuthenticate`)
   - Claims extraction (scopes, Auth0 RBAC permissions, namespaced roles)
   - Auth endpoints (`/api/v1/auth/me`, `/api/v1/auth/status`)

3. **Phase 3: Authorization, RBAC & User Management** (Planned)
   - JIT user profile synchronization from Auth0 tokens
   - Role-Based Access Control with 5 system roles and 13 permissions
   - Hono authorization middleware (`authorizeRole`, `authorizePermission`)
   - User, Role, Permission, and Admin metrics modules

4. **Phase 4: Production Infrastructure & Hardening** (Planned)
   - Redis 8 integration via `ioredis`
   - Distributed sliding-window rate limiting with IETF headers
   - Authorization caching for user contexts
   - Security hardening (CORS, security headers)
   - Fault-isolated asynchronous audit logging
   - OpenAPI / Swagger documentation
   - Docker containerization

5. **Phase 5: Final Integration & Test Implementation** (Planned)
   - Vitest 5 testing infrastructure
   - Database seeding script (`prisma/seed.ts`)
   - Complete unit, integration, and security test suites
