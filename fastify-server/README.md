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
| Redis | 8.x (`ioredis` ^6.0) | High-throughput distributed caching, rate limiting, and session state |
| jose | ^6.2 | Asymmetric JWT & JWKS cryptographic verification |
| @fastify/helmet | ^13.0 | Secure HTTP response headers (CSP, HSTS, frameguard, etc.) |
| @fastify/cors | ^11.0 | Standard-compliant Cross-Origin Resource Sharing |
| @fastify/swagger | ^9.4 | OpenAPI 3.0.3 specification generator |
| @fastify/swagger-ui | ^5.2 | Interactive API documentation UI |
| Pino | ^10.4 | Structured logging with redaction |
| Zod | ^4.6 | Schema & environment validation |
| Docker | Multi-stage | Production containerization & local orchestration |
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
│   ├── schema.prisma           # Prisma models (ApplicationUser, Role, Permission, UserRole, RolePermission, AuditLog)
│   └── migrations/             # Database migrations
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment configuration (App, Auth0, DB, Redis, RateLimit)
│   │   ├── database.config.ts  # Database connection pool configuration
│   │   ├── logger.config.ts    # Pino configuration with redaction
│   │   ├── auth0.config.ts     # Auth0 domain, audience & algorithm configuration
│   │   └── app.config.ts       # Centralized application configuration
│   │
│   ├── common/
│   │   ├── constants/          # HTTP status, SYSTEM_ROLES, PERMISSIONS constants
│   │   ├── enums/              # Error codes and shared enumerations
│   │   ├── interfaces/         # API response type definitions
│   │   ├── types/              # Common domain types
│   │   └── utils/              # AppError class and response formatting helpers
│   │
│   ├── database/
│   │   ├── prisma.client.ts    # Singleton Prisma client with PostgreSQL adapter pool
│   │   └── database.service.ts # Connection lifecycle, health checks, and ping
│   │
│   ├── infrastructure/
│   │   ├── redis/
│   │   │   ├── redis.constants.ts  # Key prefixes and default TTLs
│   │   │   ├── redis.types.ts      # Redis client and connection types
│   │   │   ├── redis.config.ts     # Redis connection configuration with backoff
│   │   │   ├── redis.client.ts     # Singleton ioredis client with reconnection strategy
│   │   │   └── redis.service.ts    # Redis cache operations & atomic rate limiting pipeline
│   │   └── cache/
│   │       └── auth-cache.service.ts # Distributed user authorization context cache
│   │
│   ├── hooks/
│   │   ├── authorize-role.hook.ts        # Role-based access control preHandler hook
│   │   └── authorize-permission.hook.ts  # Permission-based access control preHandler hook
│   │
│   ├── integrations/
│   │   └── auth0/
│   │       ├── auth0.constants.ts    # Auth0 header and JWKS caching constants
│   │       ├── auth0.types.ts        # AuthenticatedUser and token verification types
│   │       ├── auth0.client.ts       # jose createRemoteJWKSet with auto-rotation
│   │       ├── auth0.claim-mapper.ts # Claim extraction (scopes, permissions, roles)
│   │       ├── auth0.verifier.ts     # Cryptographic JWT verification and error mapping
│   │       └── auth0.module.ts       # Barrel exports
│   │
│   ├── plugins/
│   │   ├── request-id.plugin.ts    # X-Request-ID propagation
│   │   ├── error-handler.plugin.ts # Centralized exception and 404 handler
│   │   ├── auth.plugin.ts          # Authenticate and optionalAuthenticate hooks with JIT sync
│   │   └── rate-limit.plugin.ts    # Redis-backed distributed rate limiter preHandler hook
│   │
│   ├── docs/
│   │   └── swagger.plugin.ts       # Fastify Swagger & Swagger UI integration
│   │
│   ├── types/
│   │   └── fastify.d.ts            # FastifyRequest (auth, currentUser) and FastifyInstance augmentation
│   │
│   ├── modules/
│   │   ├── health/
│   │   │   ├── health.types.ts
│   │   │   ├── health.service.ts
│   │   │   ├── health.controller.ts
│   │   │   └── health.routes.ts      # /health, /health/live, /health/ready, /health/dependencies
│   │   │
│   │   ├── auth/
│   │   │   ├── auth.types.ts         # /me and /status DTOs
│   │   │   ├── auth.service.ts       # Auth business logic
│   │   │   ├── auth.controller.ts    # Route handlers
│   │   │   └── auth.routes.ts        # Auth routes (/me, /status)
│   │   │
│   │   ├── users/
│   │   │   ├── users.types.ts        # User DTOs and CurrentUserContext
│   │   │   ├── users.schema.ts       # Zod validation schemas
│   │   │   ├── users.repository.ts   # Prisma database access
│   │   │   ├── users.service.ts      # JIT synchronization, caching & audit logging
│   │   │   ├── users.controller.ts   # User controller handlers
│   │   │   └── users.routes.ts       # User routes (/users/me, /users, etc.)
│   │   │
│   │   ├── roles/
│   │   │   ├── roles.types.ts        # Role DTOs
│   │   │   ├── roles.schema.ts       # Zod validation schemas
│   │   │   ├── roles.repository.ts   # Prisma database access
│   │   │   ├── roles.service.ts      # Role CRUD, cache eviction & audit logging
│   │   │   ├── roles.controller.ts   # Role controller handlers
│   │   │   └── roles.routes.ts       # Role routes (/roles, /users/:id/roles)
│   │   │
│   │   ├── permissions/
│   │   │   ├── permissions.types.ts      # Permission DTOs
│   │   │   ├── permissions.schema.ts     # Zod validation schemas
│   │   │   ├── permissions.repository.ts # Prisma database access
│   │   │   ├── permissions.service.ts    # Permission catalog & role mapping
│   │   │   ├── permissions.controller.ts # Permission controller handlers
│   │   │   └── permissions.routes.ts     # Permission routes (/permissions)
│   │   │
│   │   ├── audit-logs/
│   │   │   ├── audit-logs.types.ts       # Audit action types & query parameters
│   │   │   ├── audit-logs.schema.ts      # Zod validation schemas
│   │   │   ├── audit-logs.repository.ts  # Prisma database persistence
│   │   │   ├── audit-logs.service.ts     # Fault-isolated asynchronous audit logging
│   │   │   ├── audit-logs.controller.ts  # Audit log controller handlers
│   │   │   └── audit-logs.routes.ts      # Audit log routes (/audit-logs, /:id)
│   │   │
│   │   └── admin/
│   │       ├── admin.types.ts        # Admin metric DTOs
│   │       ├── admin.service.ts      # Aggregate statistics calculation
│   │       ├── admin.controller.ts   # Admin controller handlers
│   │       └── admin.routes.ts       # Admin routes (/admin/dashboard, etc.)
│   │
│   ├── services/
│   │   └── logger.service.ts   # Singleton Pino logger
│   │
│   ├── app.ts                  # Fastify app factory with Helmet, CORS, Swagger & rate limiters
│   └── server.ts               # Server bootstrap, multi-resource startup & graceful shutdown
│
├── docs/
│   ├── architecture.md               # Architecture and phase roadmap
│   ├── auth0-integration.md          # Auth0 token verification and frontend contract
│   ├── rbac.md                       # Roles and permissions catalog
│   ├── authorization-architecture.md # JIT user sync & authorization architecture
│   ├── infrastructure.md             # Redis, rate limiting & caching architecture
│   ├── security.md                   # Security hardening, Helmet, CORS, input sanitization
│   ├── observability.md              # Health checks, readiness probes, structured logging & auditing
│   ├── deployment.md                 # Production Docker, Compose, and orchestration guide
│   ├── api-documentation.md          # Complete REST API endpoint reference
│   ├── database.md                   # PostgreSQL schema, ER diagram, and seeding documentation
│   └── testing.md                    # Vitest test suite architecture and execution commands
│
├── tests/
│   ├── helpers/                      # Test app builder, Auth0 mocks, Redis mocks
│   ├── unit/                         # Unit tests (config, auth0, hooks, plugins, services, cache)
│   ├── integration/                  # End-to-end integration tests (health, auth, users, roles, perms, audit, admin)
│   └── security/                     # Security tests (auth bypass, RBAC escalation, rate limit exhaustion)
│
├── prisma/
│   ├── schema.prisma                 # Prisma models (ApplicationUser, Role, Permission, UserRole, RolePermission, AuditLog)
│   └── seed.ts                       # Idempotent database seed script (system roles & permissions)
│
├── Dockerfile                        # Multi-stage production Dockerfile
├── .dockerignore                     # Docker build context exclusions
├── docker-compose.yml                # Local multi-service composition (Fastify, PostgreSQL, Redis)
├── .env.example                      # Environment variable template
├── .gitignore                        # Git ignore rules
├── .prettierrc                       # Prettier configuration
├── .prettierignore                   # Prettier ignore rules
├── eslint.config.js                  # ESLint flat configuration
├── tsconfig.json                     # TypeScript configuration
├── tsconfig.build.json               # TypeScript production build configuration
├── vitest.config.ts                  # Vitest configuration with V8 coverage
├── package.json                      # Project metadata, scripts, and dependencies
└── README.md                         # This file
```

---

## API Overview

| Resource | Method | Endpoint | Protection |
|---|---|---|---|
| **Health** | `GET` | `/health` (also `/api/v1/health`) | Public |
| **Health Liveness** | `GET` | `/health/live` (also `/live`) | Public |
| **Health Readiness**| `GET` | `/health/ready` (also `/ready`) | Public |
| **Health Dependencies**| `GET` | `/health/dependencies` | Public |
| **Documentation** | `GET` | `/docs` | Public |
| **Documentation** | `GET` | `/openapi.json` | Public |
| **Auth** | `GET` | `/api/v1/auth/status` | Optional Authenticate |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated |
| **Users** | `GET` | `/api/v1/users/me` | Authenticated |
| **Users** | `PATCH` | `/api/v1/users/me` | Authenticated |
| **Users** | `GET` | `/api/v1/users` | Permission: `users:read` |
| **Users** | `GET` | `/api/v1/users/:id` | Permission: `users:read` |
| **Users** | `PATCH` | `/api/v1/users/:id` | Permission: `users:write` |
| **Users** | `PATCH` | `/api/v1/users/:id/status` | Permission: `users:write` |
| **User Roles** | `PUT` | `/api/v1/users/:id/roles` | Permission: `roles:assign` |
| **Roles** | `GET` | `/api/v1/roles` | Permission: `roles:read` |
| **Roles** | `GET` | `/api/v1/roles/:id` | Permission: `roles:read` |
| **Roles** | `POST` | `/api/v1/roles` | Permission: `roles:write` |
| **Roles** | `PATCH` | `/api/v1/roles/:id` | Permission: `roles:write` |
| **Roles** | `DELETE` | `/api/v1/roles/:id` | Permission: `roles:delete` |
| **Role Permissions** | `GET` | `/api/v1/roles/:id/permissions` | Permission: `roles:read` |
| **Role Permissions** | `PUT` | `/api/v1/roles/:id/permissions` | Permission: `roles:write` |
| **Permissions** | `GET` | `/api/v1/permissions` | Permission: `roles:read` |
| **Audit Logs** | `GET` | `/api/v1/audit-logs` | Permission: `audit:read` |
| **Audit Logs** | `GET` | `/api/v1/audit-logs/:id` | Permission: `audit:read` |
| **Admin** | `GET` | `/api/v1/admin/dashboard` | Role: `SUPER_ADMIN`, `ADMIN` or `metrics:read` |
| **Admin** | `GET` | `/api/v1/admin/users/statistics` | Role: `SUPER_ADMIN`, `ADMIN` |
| **Admin** | `GET` | `/api/v1/admin/roles/statistics` | Role: `SUPER_ADMIN`, `ADMIN` |

---

## Implementation Status

### ✅ Phase 1 — Foundation & Architecture
- Fastify 5 application foundation with plugin architecture
- TypeScript strict configuration (ESM `NodeNext`)
- Zod-validated environment configuration
- Pino structured logging with redaction
- Prisma 7 with PostgreSQL 18 driver adapter (`@prisma/adapter-pg`)
- Centralized error handling plugin and 404 handler
- Request correlation ID plugin (`X-Request-ID`)
- Health check module (`/health`, `/health/live`, `/health/ready`)
- Graceful shutdown for HTTP server and database pool

### ✅ Phase 2 — Auth0 Integration & Authentication Architecture
- Auth0 JWT access token verification via `jose` v6
- Asymmetric signature validation using Auth0 remote JWKS
- Dynamic key caching, key rotation, and cooldown management
- Fastify authentication hooks: `authenticate` (mandatory) and `optionalAuthenticate`
- Fastify request decoration (`request.auth: AuthenticatedUser`)
- Claim extraction: scopes, Auth0 RBAC permissions, and namespaced custom roles
- Auth module with `/api/v1/auth/me` and `/api/v1/auth/status` endpoints
- Authentication error handling mapping token expiry, audience/issuer mismatches, and format errors
- Complete Auth0 integration guide and frontend client contract (`docs/auth0-integration.md`)

### ✅ Phase 3 — Authorization, RBAC & User Management
- Prisma models: `ApplicationUser`, `Role`, `Permission`, `UserRole`, `RolePermission`
- Just-in-Time (JIT) user profile synchronization from Auth0 tokens
- Role-Based Access Control (RBAC) with 5 system roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`, `VIEWER`)
- Granular resource-action permissions (`users:read`, `roles:assign`, etc.)
- Reusable Fastify preHandler authorization hooks (`authorizeRole`, `authorizePermission`)
- Fastify request decoration (`request.currentUser: CurrentUserContext`)
- User management API (`/users/me`, `/users`, status management)
- Role management API and user-role assignment/revocation with lockout and system role safeguards
- Permission management API and atomic bulk role-permission mapping
- Admin metrics and system dashboard APIs
- Complete RBAC, architecture, and API documentation

### ✅ Phase 4 — Production-Ready Capabilities & Infrastructure
- Centralized Redis 8 infrastructure via `ioredis` with exponential backoff & connection lifecycle management
- Distributed sliding-window rate limiting plugin with IETF standard headers (`RateLimit-Limit`, `Remaining`, `Reset`)
- High-performance Redis caching layer for authenticated user contexts (`auth-cache.service.ts`) with smart invalidation
- Asynchronous, fault-isolated database audit logging module (`AuditLog` model, repository, service, controller, and routes)
- Security hardening with `@fastify/helmet` (CSP, HSTS, frameguard, etc.) and strict origin validation with `@fastify/cors`
- Interactive OpenAPI 3.0.3 specification (`/openapi.json`) and Swagger UI documentation (`/docs`) via `@fastify/swagger` and `@fastify/swagger-ui`
- Advanced deep dependency health check endpoint (`/health/dependencies`) reporting PostgreSQL and Redis latency
- Coordinated multi-resource graceful shutdown handler (HTTP server, Redis client, PostgreSQL pool) with forced timeout
- Production multi-stage Docker container (`Dockerfile`, `.dockerignore`) and local orchestration (`docker-compose.yml`)
- Complete infrastructure, security, observability, deployment, and API documentation guides

### ✅ Phase 5 — Final Integration, Test Implementation & Production Readiness (Current)
- Vitest 5 testing infrastructure configured with V8 code coverage provider (`vitest.config.ts`)
- Idempotent database seed script (`prisma/seed.ts`) populating all 13 system permissions, 5 system roles, and default role-permission mappings
- Test harness with Fastify in-memory `inject()` integration and typed mocks (`mock-auth0.ts`, `mock-redis.ts`, `test-app.ts`)
- Comprehensive unit test suites covering configuration validation, Auth0 claim extraction, token verification, rate limiting, and all domain services
- End-to-end integration test suites covering Health, Auth, Users, Roles, Permissions, Audit Logs, and Admin metrics endpoints
- Security regression test suites verifying authentication bypass defenses, privilege escalation prevention, and rate-limit exhaustion
- Complete database and testing documentation guides (`docs/database.md`, `docs/testing.md`)

---

**Current Progress: 5/5 phases completed | 0 remaining (All Phases Implemented)**
