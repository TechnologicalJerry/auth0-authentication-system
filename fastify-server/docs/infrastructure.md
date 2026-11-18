# Infrastructure Architecture — Fastify Server

This document details the infrastructure layer of `fastify-server`, focusing on PostgreSQL 18, Redis 8, connection lifecycle management, and distributed caching.

---

## 1. PostgreSQL 18 & Prisma ORM

### Driver Adapter Architecture
`fastify-server` runs on **PostgreSQL 18** managed via **Prisma 7** using the `@prisma/adapter-pg` driver adapter.

```
Application Layer (Fastify 5)
       │
       ▼
 Prisma Client (Singleton)
       │
       ▼
 @prisma/adapter-pg (Driver Adapter)
       │
       ▼
 pg (Node.js PostgreSQL Connection Pool)
       │
       ▼
 PostgreSQL 18 Database Engine
```

### Connection Management
- Connection is initialized explicitly on application bootstrap (`databaseService.connect()`).
- On server termination, `databaseService.disconnect()` cleanly releases pooled client sockets.
- Ping checks execute `SELECT 1` queries measuring round-trip latency in milliseconds.

---

## 2. Redis 8 Infrastructure

### Architecture & Connection Management
Redis 8 is utilized as a centralized, high-performance distributed cache and rate-limiting data store:

```
                  ┌──────────────────────┐
                  │    Fastify Server    │
                  └──────────┬───────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │  RedisService (IoC)  │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
┌──────────────────────┐            ┌──────────────────────┐
│ Authorization Caching│            │ Distributed Limiting │
│ (TTL: 300s, JSON)    │            │ (Sliding Window Incr)│
└──────────────────────┘            └──────────────────────┘
```

### Reconnection Strategy
The client implements exponential backoff with jitter:
- Initial reconnect delay: `50ms`
- Reconnection factor: `2x`
- Max reconnect delay: `2000ms`
- Max retry attempts: `5`

---

## 3. Distributed Authorization Caching

`AuthCacheService` caches resolved user contexts (`CurrentUserContext`):
- Key format: `auth0_fastify:auth:user:<auth0UserId>`
- Default TTL: 300 seconds (`5 minutes`)
- **Invalidation Strategy**:
  - `invalidateUser(auth0UserId)`: Triggered on user status update, profile changes, and user-role assignment/revocation.
  - `invalidateAll()`: Triggered on global role update, role deletion, or bulk permission updates.

---

## 4. Multi-Tier Distributed Rate Limiting

Rate limiting utilizes an atomic Redis pipeline executing `INCR` and `PTTL`:

| Tier | Window | Max Requests | Protected Endpoints |
|---|---|---|---|
| **Global** | 60s | 100 req | `/users`, `/roles`, `/permissions` |
| **Auth** | 60s | 20 req | `/auth/*` |
| **Admin** | 60s | 60 req | `/admin/*`, `/audit-logs/*` |
