# Infrastructure Architecture

This document details the infrastructure layer of the `auth0-authentication-system` Express backend, focusing on PostgreSQL 18, Redis 8, connection lifecycle management, and distributed caching.

---

## 1. PostgreSQL 18 & Prisma ORM

### Driver Adapter Architecture
The application runs on **PostgreSQL 18** managed via **Prisma 7** using the official `@prisma/adapter-pg` driver adapter.

```
Application Layer
       │
       ▼
 Prisma Client (Singleton)
       │
       ▼
 @prisma/adapter-pg (Driver Adapter)
       │
       ▼
 pg (Node.js PostgreSQL Client & Connection Pool)
       │
       ▼
 PostgreSQL 18 Database Engine
```

### Connection Management
- Connection is initialized explicitly on application bootstrap (`databaseService.connect()`).
- On server termination, `databaseService.disconnect()` cleanly releases pooled sockets.
- Ping checks execute `SELECT 1` queries with millisecond response time instrumentation.

---

## 2. Redis 8 Infrastructure

### Architecture & Connection Management
Redis 8 is utilized as a centralized, high-performance distributed cache and rate-limiting data store:

```
                  ┌──────────────────────┐
                  │    Express Server    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  RedisService (IoC)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌────────────────────────┐       ┌────────────────────────┐
│ Distributed Rate Limit │       │ Authorization Caching  │
│ (Atomic Multi/Pipeline)│       │ (User Context & Roles) │
└───────────┬────────────┘       └────────────┬───────────┘
            │                                 │
            └────────────────┬────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Redis 8 Cluster    │
                  │ (Port 6379, KeyPrefix)│
                  └──────────────────────┘
```

### Client Configuration (`ioredis`)
- **Exponential Backoff Reconnection**: Reconnect delays start at 50ms and double up to a maximum of 2000ms (`REDIS_RECONNECT.MAX_DELAY_MS`), stopping after `maxRetries` (default: 5) to prevent resource exhaustion during extended outages.
- **Key Prefixing**: All keys are automatically prefixed with `REDIS_KEY_PREFIX` (default: `auth0_app:`) to avoid key collisions in shared Redis instances.
- **Fail-Safe Operation**: If Redis becomes temporarily unreachable, cache lookups fall back to database queries, and rate limiters fail open for non-critical paths while logging structured warnings.
- **Security**: Redis credentials and passwords are never logged. TLS connections are supported via `REDIS_TLS_ENABLED=true`.

---

## 3. Distributed Cache Architecture

### Authorization Caching
- **Cached Entity**: `CurrentUserContext` (including user ID, active roles, and distinct permissions).
- **Key Format**: `auth0_app:auth:user:${auth0UserId}`
- **TTL**: Configurable via `AUTH_CACHE_TTL_SECONDS` (default: 300 seconds / 5 minutes).

### Invalidation Strategies
To guarantee security, authorization cache entries are proactively invalidated on the following events:
1. **User Role Assignment**: When a role is added to a user.
2. **User Role Revocation**: When a role is revoked from a user.
3. **Role Permission Modification**: When permissions for a role are modified, all cached user authorization contexts are invalidated (`authCacheService.invalidateAll()`).
4. **Account Status Changes**: When an account is deactivated (`isActive: false`) or suspended (`isBlocked: true`).
5. **Profile Updates**: When user details are modified.

---

## 4. Distributed Rate Limiting

The rate limiter employs atomic Redis pipelines (`INCR` and `PTTL`) to enforce fixed-window rate limiting with millisecond accuracy:

| Limiter | Window | Max Requests | Purpose |
|---|---|---|---|
| **Global** | 60s | 100 | General API endpoint protection against scraping and denial of service. |
| **Auth** | 60s | 20 | Authentication endpoint protection against brute force and token replay. |
| **Admin** | 60s | 60 | Administrative API protection against heavy reporting queries. |

### Standard Response Headers
Every rate-limited route returns standard IETF headers:
- `RateLimit-Limit`: Maximum requests permitted in the window.
- `RateLimit-Remaining`: Remaining request quota.
- `RateLimit-Reset`: UTC epoch timestamp (in seconds) when quota resets.
- `Retry-After`: Seconds to wait before retrying (sent on HTTP 429).

