# Auth0 Authentication System — Express Server

A production-ready, scalable Express.js backend for the Auth0 Authentication System platform.

## Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 26.x LTS | Runtime environment |
| TypeScript | ^7.0 | Type-safe development |
| Express | ^5.1 | HTTP framework |
| PostgreSQL | 18 | Relational database |
| Prisma | ^7.10 | Type-safe ORM & migrations |
| Redis | 8.x (`ioredis` ^6.0) | Distributed caching & rate limiting |
| jose | ^6.2 | Asymmetric JWT/JWKS verification |
| Helmet | ^8.3 | HTTP security header hardening |
| CORS | ^2.8 | Cross-origin resource sharing policy |
| Pino | ^10.4 | High-performance structured logging |
| Zod | ^4.6 | Schema & environment validation |
| Swagger UI | ^5.0 | Interactive OpenAPI 3.0 documentation |
| Docker | Multi-stage | Containerization & local infrastructure |

## Prerequisites

- **Node.js** ≥ 26.0.0
- **npm** ≥ 12.x (bundled with Node.js 26)
- **PostgreSQL** 18 running and accessible
- **Redis** 8 running and accessible
- **Auth0 account** with a configured tenant and API

## Directory Structure

```text
express-server/
│
├── prisma/
│   ├── schema.prisma           # Prisma models (ApplicationUser, Role, Permission, UserRole, RolePermission, AuditLog)
│   └── migrations/             # Database migrations (future phases)
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment configuration
│   │   ├── database.config.ts  # Database configuration
│   │   ├── logger.config.ts    # Logger configuration with redaction paths
│   │   ├── auth0.config.ts     # Auth0 configuration
│   │   └── app.config.ts       # Centralized application configuration
│   │
│   ├── common/
│   │   ├── constants/          # HTTP status, System Roles, Permissions constants
│   │   ├── enums/              # Error codes and enumerations
│   │   ├── interfaces/         # API response type definitions
│   │   ├── types/              # Shared type exports
│   │   └── utils/              # Response helpers and AppError class
│   │
│   ├── infrastructure/
│   │   ├── redis/
│   │   │   ├── redis.client.ts      # ioredis client with exponential backoff & pooling
│   │   │   ├── redis.config.ts      # Redis configuration factory
│   │   │   ├── redis.constants.ts   # Key prefixes, reconnect constants
│   │   │   ├── redis.service.ts     # Safe Redis operations, pipeline atomic rate limiter
│   │   │   └── redis.types.ts        # Typed Redis options and results
│   │   │
│   │   └── cache/
│   │       └── auth-cache.service.ts # Redis-backed authorization caching & invalidation
│   │
│   ├── integrations/
│   │   └── auth0/
│   │       ├── auth0.client.ts        # JWKS client (jose createRemoteJWKSet)
│   │       ├── auth0.claim-mapper.ts  # JWT claim extraction utilities
│   │       ├── auth0.constants.ts     # Auth0 constants
│   │       ├── auth0.types.ts         # AuthenticatedUser, verification types
│   │       ├── auth0.verifier.ts      # JWT verification with jose
│   │       └── auth0.module.ts        # Barrel exports
│   │
│   ├── middlewares/
│   │   ├── authenticate.middleware.ts          # Required auth + JIT user sync
│   │   ├── optional-authenticate.middleware.ts # Optional auth middleware
│   │   ├── authorize-role.middleware.ts        # Role-based access control (RBAC)
│   │   ├── authorize-permission.middleware.ts  # Permission-based access control
│   │   ├── rate-limit.middleware.ts            # Distributed Redis rate limiters
│   │   ├── request-id.middleware.ts            # Correlation ID assignment
│   │   ├── error.middleware.ts                 # Global error handler
│   │   └── not-found.middleware.ts             # 404 handler
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts   # Auth endpoint handlers
│   │   │   ├── auth.routes.ts       # Auth route definitions
│   │   │   ├── auth.service.ts      # Auth business logic
│   │   │   └── auth.types.ts        # Auth response types
│   │   │
│   │   ├── users/
│   │   │   ├── users.controller.ts  # User management controller
│   │   │   ├── users.routes.ts      # User routes (/users/me, /users, etc.)
│   │   │   ├── users.service.ts     # User business logic and sync
│   │   │   ├── users.repository.ts  # Prisma database access for users
│   │   │   ├── users.schema.ts      # Zod validation schemas
│   │   │   └── users.types.ts       # User DTOs and CurrentUserContext
│   │   │
│   │   ├── roles/
│   │   │   ├── roles.controller.ts  # Role management controller
│   │   │   ├── roles.routes.ts      # Role routes (/roles, /users/:id/roles)
│   │   │   ├── roles.service.ts     # Role business logic & assignment
│   │   │   ├── roles.repository.ts  # Prisma database access for roles
│   │   │   ├── roles.schema.ts      # Zod validation schemas for roles
│   │   │   └── roles.types.ts       # Role DTOs and interfaces
│   │   │
│   │   ├── permissions/
│   │   │   ├── permissions.controller.ts # Permissions controller
│   │   │   ├── permissions.routes.ts     # Permissions routes
│   │   │   ├── permissions.service.ts    # Permissions business logic
│   │   │   ├── permissions.repository.ts # Prisma access for permissions
│   │   │   ├── permissions.schema.ts     # Zod validation schemas
│   │   │   └── permissions.types.ts      # Permission DTOs and interfaces
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.controller.ts  # Admin statistics controller
│   │   │   ├── admin.routes.ts      # Admin dashboard & metrics routes
│   │   │   ├── admin.service.ts     # Admin aggregation business logic
│   │   │   └── admin.types.ts       # Admin metrics DTOs
│   │   │
│   │   ├── audit-logs/
│   │   │   ├── audit-logs.controller.ts # Audit logs controller
│   │   │   ├── audit-logs.routes.ts     # Audit logs routes (/audit-logs)
│   │   │   ├── audit-logs.service.ts    # Audit logs logging & retrieval
│   │   │   ├── audit-logs.repository.ts # Prisma database access for audit logs
│   │   │   ├── audit-logs.schema.ts     # Zod query validation schemas
│   │   │   └── audit-logs.types.ts      # Audit log DTOs and types
│   │   │
│   │   └── health/
│   │       ├── health.controller.ts # Health check controller
│   │       ├── health.routes.ts     # Health routes (/health, /live, /ready, /dependencies)
│   │       └── health.service.ts    # Health & dependency check business logic
│   │
│   ├── docs/
│   │   ├── openapi.spec.ts          # OpenAPI 3.0.3 specification
│   │   └── swagger.routes.ts        # Swagger UI and openapi.json routes
│   │
│   ├── database/
│   │   ├── prisma.client.ts         # Singleton Prisma client with driver adapter
│   │   └── database.service.ts      # Database connection & ping management
│   │
│   ├── services/
│   │   └── logger.service.ts        # Pino logger instance
│   │
│   ├── generated/                   # Prisma-generated client (gitignored)
│   │
│   ├── app.ts                       # Express app setup, security middlewares & routes
│   └── server.ts                    # Server bootstrap, listen & graceful shutdown
│
├── tests/                           # Reserved for future phases
├── logs/                            # Application log files (gitignored)
├── docs/
│   ├── auth0-integration.md         # Auth0 integration guide
│   ├── authorization-architecture.md# User sync & authorization architecture
│   ├── rbac.md                      # Roles and permissions catalog
│   ├── api-documentation.md         # Complete API endpoints reference
│   ├── infrastructure.md            # Redis 8 & PostgreSQL infrastructure
│   ├── security.md                  # Security hardening (Helmet, CORS, Rate Limit)
│   ├── observability.md             # Observability, telemetry & health probes
│   └── deployment.md                # Docker multi-stage & container deployment
│
├── Dockerfile                       # Multi-stage Docker build
├── .dockerignore                    # Docker build ignore patterns
├── docker-compose.yml               # Complete stack (Express, Postgres 18, Redis 8)
├── prisma.config.ts                 # Prisma 7 configuration file
├── .env.example                     # Environment variable template
├── .gitignore                       # Git ignore rules
├── .prettierrc                      # Prettier configuration
├── .prettierignore                  # Prettier ignore rules
├── eslint.config.js                 # ESLint flat configuration
├── tsconfig.json                    # TypeScript configuration
├── tsconfig.build.json              # TypeScript production build configuration
├── package.json                     # Project metadata and scripts
└── README.md                        # This file
```

---

## API Overview

Detailed endpoint documentation is available in [docs/api-documentation.md](docs/api-documentation.md) and interactively at `/api/v1/docs`.

| Resource | Method | Endpoint | Protection |
|---|---|---|---|
| **Documentation** | `GET` | `/api/v1/docs` | Public |
| **Documentation** | `GET` | `/api/v1/openapi.json` | Public |
| **Health** | `GET` | `/api/v1/health` | Public |
| **Health Liveness** | `GET` | `/api/v1/health/live` | Public |
| **Health Readiness**| `GET` | `/api/v1/health/ready` | Public |
| **Dependencies** | `GET` | `/api/v1/health/dependencies` | Public |
| **Auth** | `GET` | `/api/v1/auth/status` | Public |
| **Auth** | `GET` | `/api/v1/auth/me` | Authenticated (Rate limit: 20/min) |
| **Users** | `GET` | `/api/v1/users/me` | Authenticated |
| **Users** | `PATCH` | `/api/v1/users/me` | Authenticated |
| **Users** | `GET` | `/api/v1/users` | Permission: `users:read` |
| **Users** | `GET` | `/api/v1/users/:id` | Permission: `users:read` |
| **Users** | `PATCH` | `/api/v1/users/:id` | Permission: `users:update` |
| **Users** | `PATCH` | `/api/v1/users/:id/status` | Permission: `users:update` |
| **User Roles** | `POST` | `/api/v1/users/:id/roles` | Permission: `roles:assign` |
| **User Roles** | `DELETE` | `/api/v1/users/:id/roles/:roleId` | Permission: `roles:assign` |
| **Roles** | `GET` | `/api/v1/roles` | Permission: `roles:read` |
| **Roles** | `GET` | `/api/v1/roles/:id` | Permission: `roles:read` |
| **Roles** | `POST` | `/api/v1/roles` | Permission: `roles:create` |
| **Roles** | `PATCH` | `/api/v1/roles/:id` | Permission: `roles:update` |
| **Roles** | `DELETE` | `/api/v1/roles/:id` | Permission: `roles:delete` |
| **Role Permissions** | `GET` | `/api/v1/roles/:id/permissions` | Permission: `permissions:read` |
| **Role Permissions** | `PUT` | `/api/v1/roles/:id/permissions` | Permission: `permissions:manage` |
| **Permissions** | `GET` | `/api/v1/permissions` | Permission: `permissions:read` |
| **Admin** | `GET` | `/api/v1/admin/dashboard` | Role: `SUPER_ADMIN`, `ADMIN` (Rate limit: 60/min) |
| **Admin** | `GET` | `/api/v1/admin/users/statistics` | Role: `SUPER_ADMIN`, `ADMIN` (Rate limit: 60/min) |
| **Admin** | `GET` | `/api/v1/admin/roles/statistics` | Role: `SUPER_ADMIN`, `ADMIN` (Rate limit: 60/min) |
| **Audit Logs** | `GET` | `/api/v1/audit-logs` | Permission: `audit-logs:read` (Rate limit: 60/min) |
| **Audit Logs** | `GET` | `/api/v1/audit-logs/:id` | Permission: `audit-logs:read` (Rate limit: 60/min) |

---

## Implementation Status

### ✅ Phase 1 — Foundation & Architecture
- Express 5 application foundation
- TypeScript strict configuration
- Zod-validated environment configuration
- Pino structured logging with redaction
- Prisma 7 with PostgreSQL driver adapter
- Basic health check endpoint
- Centralized error handling
- Request correlation IDs
- Graceful shutdown

### ✅ Phase 2 — Auth0 Integration
- Auth0 JWT access token verification via jose
- JWKS-based asymmetric signature validation
- Authentication middleware (required + optional)
- Auth module with `/me` and `/status` endpoints
- Auth0 claim mapping (scopes, permissions, roles)
- Comprehensive authentication error codes
- Auth0 integration documentation
- Frontend integration contract

### ✅ Phase 3 — Authorization, RBAC & User Management
- Prisma models: `ApplicationUser`, `Role`, `Permission`, `UserRole`, `RolePermission`
- Just-in-Time (JIT) user profile synchronization from Auth0 tokens
- Role-Based Access Control (RBAC) with 5 system roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`, `VIEWER`)
- Granular resource-action permissions (`users:read`, `roles:assign`, etc.)
- Reusable `authorizeRole()` and `authorizePermission()` middleware
- User management API (`/users/me`, `/users`, status management)
- Role management API and user-role assignment/revocation
- Permission management API and atomic bulk role-permission mapping
- Admin metrics and system dashboard APIs
- Complete RBAC, architecture, and API documentation

### ✅ Phase 4 — Production-Ready Capabilities & Infrastructure (Current)
- Centralized Redis 8 infrastructure with exponential backoff and connection pooling
- Distributed atomic rate limiting with standard IETF headers (`global`, `auth`, `admin`)
- Redis-backed authorization caching with automatic cache invalidation
- Security hardening: Helmet HTTP headers, strict CORS allowlist, reverse proxy trust proxy
- Audit logging module with append-only database storage and administrative search
- Swagger UI (`/api/v1/docs`) & OpenAPI 3.0.3 specification (`/api/v1/openapi.json`)
- Advanced health monitoring: `/health`, `/health/live`, `/health/ready`, `/health/dependencies`
- Multi-resource graceful shutdown with timeout protection (HTTP, Redis, Database)
- Multi-stage Dockerfile and full local Docker Compose stack
- Comprehensive infrastructure, security, observability, and deployment documentation

### 🔲 Phase 5 — Final Implementation (Planned)
- CI/CD pipelines
- Comprehensive testing
- Production deployment
- Final verification

---

**Current Progress: 4/5 phases completed | 1/5 remaining**
