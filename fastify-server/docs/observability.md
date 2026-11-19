# Observability, Telemetry & Health Checks — Fastify Server

This document outlines the observability, structured logging, request correlation, health probing, and audit logging features of `fastify-server`.

---

## 1. Request Correlation (`X-Request-ID`)

`requestIdPlugin` ensures every incoming request is assigned a unique UUIDv4 identifier:
- If a client supplies `X-Request-ID`, it is validated and propagated.
- Otherwise, a new UUIDv4 is generated.
- Attached to `request.id` and sent back in the `X-Request-ID` response header.

---

## 2. Structured Logging with Sensitive Field Redaction

Pino provides zero-overhead structured JSON logging with redaction for sensitive fields:
- `req.headers.authorization`
- `req.headers.cookie`
- `res.headers["set-cookie"]`
- `password`, `token`, `secret`, `accessToken`, `refreshToken`

---

## 3. Advanced Health Probes

| Endpoint | Purpose | Target Consumer |
|---|---|---|
| `GET /api/v1/health` | Basic application status | Uptime monitors |
| `GET /api/v1/health/live` | Process uptime and memory allocation | Kubernetes liveness probe |
| `GET /api/v1/health/ready` | PostgreSQL and Redis availability check | Kubernetes readiness probe |
| `GET /api/v1/health/dependencies` | Latency and Auth0 configuration diagnostics | DevOps & SRE dashboards |

---

## 4. Append-Only Audit Logging

The `AuditLogsService` records administrative changes, role modifications, and status changes in PostgreSQL:
- **Append-Only**: Audit records cannot be modified or deleted.
- **Fault-Isolated**: Audit logging errors are trapped and logged without failing the primary transaction.
- **Indexed Search**: Queries can filter by `actorUserId`, `action`, `resource`, `status`, and date ranges.
