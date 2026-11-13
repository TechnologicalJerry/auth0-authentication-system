# Fastify Server Architecture Specification

## 1. Overview

`fastify-server` is an asynchronous, high-throughput, enterprise-grade backend for the `auth0-authentication-system` platform built on Fastify 5 and Node.js 26 Active LTS.

It mirrors the architectural domain model, database schema, security posture, and role-based access control established in `express-server`, leveraging Fastify's native plugin architecture, lifecycle hooks, and high-performance serialization.

---

## 2. Technology Stack

- **Runtime**: Node.js 26.x Active LTS
- **Language**: TypeScript 7.x (ESM `NodeNext`)
- **HTTP Framework**: Fastify 5.x
- **Plugin Architecture**: `fastify-plugin`
- **Database**: PostgreSQL 18
- **ORM**: Prisma 7.x with `@prisma/adapter-pg` driver adapter
- **Configuration & Validation**: Zod 4.x
- **Logging**: Pino 10.x with native Fastify logger integration
- **Linting & Formatting**: ESLint 9 (flat config) & Prettier 3

---

## 3. Directory Layout

```text
fastify-server/
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
│   ├── app.ts                  # Fastify application factory (buildApp)
│   └── server.ts               # Server bootstrap, listen, and graceful shutdown
│
├── docs/
│   └── architecture.md         # This specification document
│
├── .env.example
├── .gitignore
├── .prettierrc
├── .prettierignore
├── eslint.config.js
├── tsconfig.json
├── tsconfig.build.json
├── package.json
└── README.md
```

---

## 4. Phase Rollout Roadmap

1. **Phase 1: Foundation and Architecture** (Completed): Project configuration, TypeScript ESM setup, Fastify 5 architecture, Zod environment validation, Pino logging, Prisma PostgreSQL 18 infrastructure, centralized error handling, and health module.
2. **Phase 2: Auth0 Integration and Authentication Architecture**: jose JWKS verification, preHandler authentication hooks, `/api/v1/auth/me`, `/status`, and claim extraction.
3. **Phase 3: Authorization, RBAC and User Management**: Prisma models, JIT user synchronization, system roles, granular permissions, `authorizeRole` and `authorizePermission` hooks, user and role management routes.
4. **Phase 4: Redis, Security, Auditing, Observability and Infrastructure**: Redis 8 integration, distributed rate limiting, authorization caching, Helmet/CORS plugins, audit logging, Swagger/OpenAPI documentation, advanced health probes, and Docker configuration.
5. **Phase 5: Final Integration, Test Implementation & Production Readiness**: Vitest test suites, `fastify.inject()` integration tests, security regression tests, idempotent database seed script, and database/testing documentation.

