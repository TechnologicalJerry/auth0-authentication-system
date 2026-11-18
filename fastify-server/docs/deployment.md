# Deployment & Containerization Guide — Fastify Server

This document outlines the Docker containerization strategy, multi-stage builds, and Docker Compose orchestration for `fastify-server`.

---

## 1. Multi-Stage Dockerfile Architecture

The `Dockerfile` employs a two-stage build pattern:
- **`builder` stage**: Installs all dependencies (including devDependencies), generates the Prisma client, and compiles TypeScript into `dist/`.
- **`runner` stage**: Uses an Alpine Linux base, copies only production artifacts and pruned dependencies, runs as non-root user `node`, and configures an automated container `HEALTHCHECK`.

---

## 2. Local Stack Orchestration (`docker-compose.yml`)

The provided Compose file starts:
1. `postgres`: PostgreSQL 18 with persistent volume and health check.
2. `redis`: Redis 8 with persistent volume and health check.
3. `fastify-server`: Built from `Dockerfile`, starts only after dependencies become healthy.

```bash
# Start the full stack
docker compose up -d --build

# Inspect logs
docker compose logs -f fastify-server

# Tear down
docker compose down
```
