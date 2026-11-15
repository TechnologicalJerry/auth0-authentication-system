# Testing Strategy & Test Suite Architecture

This document describes the test architecture, test organization, mocking strategies, and execution commands for `express-server`.

---

## 1. Testing Framework & Philosophy

- **Test Runner**: Vitest 5.x
  - Native ESM and TypeScript support without Babel/ts-jest overhead.
  - In-process module mocking with full type inference.
  - Native code coverage integration (`v8` provider).
- **HTTP Testing**: Supertest 7.x
  - Direct integration testing against Express 5 application instances without socket binding or port conflicts.

---

## 2. Directory Structure

```text
tests/
├── helpers/
│   ├── mock-auth0.ts        # Mock Auth0 user claims, tokens, and authorization headers
│   ├── mock-redis.ts        # In-memory Redis mock for unit testing without live server
│   └── test-app.ts          # Express application factory for Supertest
│
├── unit/
│   ├── config/
│   │   └── env.config.test.ts
│   ├── auth0/
│   │   ├── auth0.claim-mapper.test.ts
│   │   └── auth0.verifier.test.ts
│   ├── middlewares/
│   │   ├── authenticate.middleware.test.ts
│   │   ├── authorize.middleware.test.ts
│   │   └── rate-limit.middleware.test.ts
│   ├── services/
│   │   ├── users.service.test.ts
│   │   ├── roles.service.test.ts
│   │   ├── permissions.service.test.ts
│   │   └── audit-logs.service.test.ts
│   └── cache/
│       └── auth-cache.service.test.ts
│
├── integration/
│   ├── health.test.ts       # Health, liveness, readiness, dependency probes
│   ├── auth.test.ts         # Public status, authenticated /auth/me
│   ├── users.test.ts        # User profile, admin user management, pagination
│   ├── roles.test.ts        # Role CRUD, role permission queries
│   ├── permissions.test.ts  # Permission catalog retrieval
│   ├── audit-logs.test.ts   # Audit trail retrieval & filtering
│   └── admin.test.ts        # Admin dashboard and metric aggregations
│
└── security/
    ├── auth-bypass.test.ts      # Missing tokens, invalid signatures, expired JWTs, suspended users
    ├── rbac-escalation.test.ts  # Privilege escalation attempts, lockout prevention, system role guards
    └── rate-limit.test.ts       # Quota exhaustion, 429 responses, rate limit headers
```

---

## 3. Mocking & Test Isolation

### Auth0 Verification
In unit and integration tests, `auth0Verifier.verifyAccessToken` is mocked to return structured `AuthenticatedUser` profiles without making live HTTPS network requests to Auth0 tenants.

### Redis Infrastructure
`redisService` methods (`get`, `set`, `del`, `consumeToken`) are mocked or backed by `InMemoryRedisMock`, validating distributed cache keys and token-bucket algorithm mechanics independently of a running Redis server.

### Database Layer
Service tests isolate Prisma database repositories using `vi.mock()` to test business invariants, permission checks, and error throwing in complete isolation.

---

## 4. Test Execution Commands

Once the implementation phase is concluded and verification begins:

```bash
# Run all unit, integration, and security tests
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run tests and generate code coverage report
npm run test:coverage
```

