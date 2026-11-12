# Observability, Monitoring & Health Probes

This document outlines the observability, telemetry, and health monitoring architecture of the `auth0-authentication-system` Express backend.

---

## 1. Structured Logging & Correlation IDs

### Request Correlation IDs
Every incoming HTTP request is assigned a unique UUID via `requestIdMiddleware`:
- If the incoming request contains an `X-Request-ID` header, that value is reused.
- If absent, a new UUID v4 is generated.
- The ID is attached to `req.id` and echoed in the response header `X-Request-ID`.
- Every log message emitted during request processing automatically carries the correlation ID.

### Structured JSON Logging (Pino)
- **Production (`NODE_ENV=production`)**: Emits raw JSON lines for ingestion into Logstash, Datadog, CloudWatch, or OpenTelemetry collectors.
- **Development (`NODE_ENV=development`)**: Emits colorized, human-readable terminal output via `pino-pretty`.
- **Serializers**: Standardized serializers for `req`, `res`, and `err` capture method, URL, status code, IP, and sanitized stack traces.

---

## 2. Health & Readiness Monitoring

The health check module provides endpoints designed for cloud orchestrators (Kubernetes, Docker Swarm, Nomad) and automated monitoring systems:

### 1. General Health Check
- **Endpoint**: `GET /api/v1/health`
- **Purpose**: Quick ping verification.
- **Payload**: Application name, version, environment, and timestamp.

### 2. Liveness Probe
- **Endpoint**: `GET /api/v1/health/live`
- **Purpose**: Verifies that the Node.js event loop and process are alive.
- **Payload**:
  - `uptimeSeconds`: Process uptime in seconds.
  - `memoryUsage`: RSS, heap used, and heap total in megabytes.
  - `timestamp`: ISO-8601 string.
- **Expected Status**: `200 OK`.

### 3. Readiness Probe
- **Endpoint**: `GET /api/v1/health/ready`
- **Purpose**: Verifies whether the server can safely handle incoming user requests.
- **Checks**:
  - PostgreSQL connectivity (via `SELECT 1`).
  - Redis connectivity (via `PING`).
- **Responses**:
  - `200 OK`: Database is healthy; server is ready for traffic.
  - `503 Service Unavailable`: Critical dependency (database) is unreachable.

### 4. Dependency Diagnostics
- **Endpoint**: `GET /api/v1/health/dependencies`
- **Purpose**: In-depth dependency health and latency metrics for operational diagnostics.
- **Payload**:
  - `database`: PostgreSQL status and roundtrip latency in milliseconds.
  - `redis`: Redis status and roundtrip ping latency in milliseconds.
  - `auth0`: Configuration state and domain metadata (no secrets exposed).
- **Responses**:
  - `200 OK`: All dependencies healthy or degraded non-critical dependency.
  - `503 Service Unavailable`: Critical dependency failure.

---

## 3. Error Classification & Status Propagation

Errors are structured through the `AppError` architecture:
- **Operational Errors** (e.g., validation errors, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate limit exceeded): Logged at `warn` or `debug` level.
- **System / Non-Operational Errors** (e.g., database connection drops, unhandled exceptions): Logged at `error` or `fatal` level with full error stack traces.
- In production, internal error details and database stack traces are sanitized before sending responses to clients.

