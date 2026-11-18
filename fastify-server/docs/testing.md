# Testing Strategy & Test Suite Architecture — Fastify Server

This document describes the testing strategy, test suite architecture, mocking patterns, and execution commands for `fastify-server`.

---

## 1. Testing Framework & Philosophy

- **Test Runner**: Vitest 5.x
  - Native ECMAScript Modules (ESM) and TypeScript support without Babel or ts-jest transformation overhead.
  - In-process module and service mocking with complete type safety.
  - Native V8 code coverage integration (`@vitest/coverage-v8`).
- **HTTP Testing**: Fastify Native `inject()` & Supertest
  - Direct in-memory request injection against `FastifyInstance` without binding to a physical network port or triggering port conflict issues.
  - Tests verify end-to-end request lifecycle: routing, plugins, preHandlers, validation, business services, and error handling.

---

## 2. Directory Structure

```text
fastify-server/tests/
├── helpers/
│   ├── mock-auth0.ts        # Mock Auth0 user claims, tokens, and authorization headers
│   ├── mock-redis.ts        # In-memory Redis mock for unit testing without live server
│   └── test-app.ts          # Fastify test instance builder via getTestApp()
│
├── unit/
│   ├── config/
│   │   └── env.config.test.ts          # Zod environment variable parsing
│   ├── auth0/
│   │   ├── auth0.claim-mapper.test.ts  # Scope, permission, and role claim extraction
│   │   └── auth0.verifier.test.ts      # Cryptographic token verification & error mapping
│   ├── hooks/
│   │   ├── authorize-role.hook.test.ts       # Role-based access control preHandler hook
│   │   └── authorize-permission.hook.test.ts # Permission-based access control preHandler hook
│   ├── plugins/
│   │   ├── auth.plugin.test.ts         # Bearer token extraction and authentication hook
│   │   └── rate-limit.plugin.test.ts   # Distributed rate limiter preHandler hook
│   ├── services/
│   │   ├── users.service.test.ts       # User synchronization, state gating, and profiles
│   │   ├── roles.service.test.ts       # Role safeguards, lockout protection, assignments
│   │   ├── permissions.service.test.ts # Role-permission mapping and cache eviction
│   │   └── audit-logs.service.test.ts  # Fault-isolated asynchronous audit logging
│   └── cache/
│       └── auth-cache.service.test.ts  # Redis user context caching and invalidation
│
├── integration/
│   ├── health.test.ts       # Health, liveness, readiness, and dependency latency probes
│   ├── auth.test.ts         # Public status and authenticated /auth/me endpoints
│   ├── users.test.ts        # User profile, pagination, and status management
│   ├── roles.test.ts        # Role CRUD, role-permission management
│   ├── permissions.test.ts  # Permission catalog inspection
│   ├── audit-logs.test.ts   # Paginated audit log querying and detail inspection
│   └── admin.test.ts        # System dashboard statistics and aggregate metrics
│
└── security/
    ├── auth-bypass.test.ts      # Header tampering, malformed tokens, expired credentials
    ├── rbac-escalation.test.ts  # Privilege escalation defense and mutation stripping
    └── rate-limit.test.ts       # Quota exhaustion and 429 Too Many Requests defense
```

---

## 3. Mocking & Isolation Strategy

1. **Auth0 Identity Provider**:
   - Cryptographic verification via `jose.jwtVerify` is mocked using `vi.mock('jose')` to simulate valid tokens, expired tokens, untrusted issuers, and invalid signatures without contacting Auth0 tenants.
   - Standard mock identities (`MOCK_AUTH0_USER`, `MOCK_ADMIN_USER`, `MOCK_SUPER_ADMIN_USER`) provide consistent claims.

2. **Redis & Rate Limiting**:
   - `redisService.consumeRateLimit` is mocked to test both permitted traffic and quota exhaustion (`429 Too Many Requests` with `Retry-After` headers).
   - `InMemoryRedisMock` is available for fine-grained key-value simulation.

3. **Database Layer (Prisma)**:
   - Repositories (`usersRepository`, `rolesRepository`, `permissionsRepository`, `auditLogsRepository`) are isolated in service unit tests to guarantee fast, deterministic test runs without external PostgreSQL dependencies.

---

## 4. Test Execution Commands

| Command | Purpose |
|---|---|
| `npm test` | Runs the full Vitest test suite once |
| `npm run test:watch` | Starts Vitest in interactive watch mode for TDD |
| `npm run test:coverage` | Generates V8 code coverage report in text, JSON, and HTML formats |
| `npm run typecheck` | Validates TypeScript compilation across `src` and `tests` without emitting JS |
| `npm run lint` | Runs ESLint 9 static analysis across the codebase |
