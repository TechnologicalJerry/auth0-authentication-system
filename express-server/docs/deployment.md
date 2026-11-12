# Deployment & Containerization Guide

This document describes how to build, run, and deploy the `auth0-authentication-system` Express backend using Docker and Docker Compose.

---

## 1. Docker Build Architecture

The backend utilizes a **multi-stage Docker build** (`Dockerfile`) to produce a minimal, secure production container image.

### Build Stages

1. **`builder` Stage**:
   - Base image: `node:26-alpine`.
   - Copies package manifests and Prisma schemas.
   - Installs all dependencies (`npm ci`).
   - Compiles TypeScript to `dist/`.
   - Generates Prisma client into `src/generated/prisma`.
   - Prunes development dependencies with `npm prune --omit=dev`.

2. **`runner` Stage**:
   - Base image: `node:26-alpine`.
   - Sets `NODE_ENV=production`.
   - Runs as non-root user `node` for defense in depth.
   - Copies only compiled output (`dist/`), generated Prisma client, and production `node_modules/`.
   - Configures a container health check hitting `/api/v1/health/live`.
   - Exposes port `4000`.

---

## 2. Local Infrastructure with Docker Compose

A pre-configured `docker-compose.yml` provides a complete local environment:

| Service | Image | Ports | Description |
|---|---|---|---|
| `postgres` | `postgres:18-alpine` | `5432:5432` | PostgreSQL 18 database with persistent volume |
| `redis` | `redis:8-alpine` | `6379:6379` | Redis 8 cache and distributed rate limiter |
| `express-server` | Built from `Dockerfile` | `4000:4000` | Express.js application |

### Starting the Stack
```bash
# Start all services in the background
docker compose up -d

# View live container logs
docker compose logs -f express-server

# Verify service health
docker compose ps

# Stop all services
docker compose down
```

---

## 3. Graceful Shutdown & Lifecycle Management

During container rolling updates, restarts, or node drains, the application receives a `SIGTERM` or `SIGINT` signal.

```
       SIGTERM / SIGINT Received
                  │
                  ▼
   Set isShuttingDown Flag (Idempotent)
                  │
                  ▼
   Start Shutdown Timeout Timer (10s)
                  │
                  ▼
   Close HTTP Server (Drain active sockets)
                  │
                  ▼
   Disconnect Redis Connection Pool
                  │
                  ▼
   Disconnect PostgreSQL Connection Pool
                  │
                  ▼
   Clear Timeout & Exit Process (Code 0)
```

- **Idempotency**: Prevents concurrent duplicate shutdown sequences.
- **Forced Termination**: If graceful shutdown exceeds `SHUTDOWN_TIMEOUT_MS` (default: 10,000ms), a forced termination (`process.exit(1)`) occurs to prevent hanging processes.
- **Unhandled Failures**: Handlers for `uncaughtException` and `unhandledRejection` log fatal diagnostic details and terminate cleanly.

