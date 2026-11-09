# Auth0 Authentication System — Express Server

A production-ready, scalable Express.js backend for the Auth0 Authentication System platform.

## Technology Stack

| Technology   | Version  | Purpose                              |
| ------------ | -------- | ------------------------------------ |
| Node.js      | 26.x LTS | Runtime                              |
| TypeScript   | ^7.0     | Type-safe development                |
| Express      | ^5.1     | HTTP framework                       |
| Prisma       | ^7.10    | ORM / Database access                |
| PostgreSQL   | 18       | Relational database                  |
| Pino         | ^10.4    | Structured logging                   |
| Zod          | ^4.6     | Schema validation                    |
| ESLint       | ^9.27    | Code linting                         |
| Prettier     | ^3.5     | Code formatting                      |
| tsx          | ^4.23    | TypeScript execution (development)   |

## Prerequisites

- **Node.js** ≥ 26.0.0
- **npm** ≥ 12.x (bundled with Node.js 26)
- **PostgreSQL** 18 running and accessible

## Directory Structure

```text
express-server/
│
├── prisma/
│   ├── schema.prisma           # Database schema definition
│   └── migrations/             # Database migrations (future phases)
│
├── src/
│   ├── config/
│   │   ├── env.config.ts       # Zod-validated environment configuration
│   │   ├── database.config.ts  # Database configuration
│   │   ├── logger.config.ts    # Logger configuration with redaction paths
│   │   └── app.config.ts       # Centralized application configuration
│   │
│   ├── common/
│   │   ├── constants/          # HTTP status codes and application constants
│   │   ├── enums/              # Error codes and enumerations
│   │   ├── interfaces/         # API response type definitions
│   │   ├── types/              # Shared type exports
│   │   └── utils/              # Response helpers and AppError class
│   │
│   ├── middlewares/
│   │   ├── request-id.middleware.ts   # Correlation ID assignment
│   │   ├── error.middleware.ts        # Global error handler
│   │   └── not-found.middleware.ts    # 404 handler for undefined routes
│   │
│   ├── modules/
│   │   └── health/
│   │       ├── health.controller.ts   # Health check controller
│   │       ├── health.routes.ts       # Health check route definitions
│   │       └── health.service.ts      # Health check business logic
│   │
│   ├── database/
│   │   ├── prisma.client.ts    # Singleton Prisma client with driver adapter
│   │   └── database.service.ts # Connection lifecycle management
│   │
│   ├── services/
│   │   └── logger.service.ts   # Pino logger instance
│   │
│   ├── generated/              # Prisma-generated client (gitignored)
│   │
│   ├── app.ts                  # Express application setup and middleware
│   └── server.ts               # Server bootstrap and graceful shutdown
│
├── tests/                      # Reserved for future phases
├── logs/                       # Application log files (gitignored)
│
├── prisma.config.ts            # Prisma 7 configuration file
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier configuration
├── .prettierignore             # Prettier ignore rules
├── eslint.config.js            # ESLint flat configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.build.json         # TypeScript production build configuration
├── package.json                # Project metadata and scripts
└── README.md                   # This file
```

## Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Environment Variables

| Variable        | Required | Default                                | Description                      |
| --------------- | -------- | -------------------------------------- | -------------------------------- |
| `NODE_ENV`      | No       | `development`                          | Application environment          |
| `PORT`          | No       | `4000`                                 | HTTP server port                 |
| `API_PREFIX`    | No       | `/api/v1`                              | API route prefix                 |
| `APP_NAME`      | No       | `auth0-authentication-system-express`  | Application name                 |
| `APP_VERSION`   | No       | `1.0.0`                                | Application version              |
| `DATABASE_URL`  | **Yes**  | —                                      | PostgreSQL connection string     |
| `LOG_LEVEL`     | No       | `info`                                 | Logging level                    |
| `LOG_FORMAT`    | No       | `json`                                 | Log format (`json` or `pretty`)  |

All environment variables are validated at startup using Zod. The application will fail fast with descriptive error messages if required variables are missing or invalid.

## Installation

```bash
cd express-server
npm install
```

## Available Scripts

| Script                    | Command                           | Description                          |
| ------------------------- | --------------------------------- | ------------------------------------ |
| `npm run dev`             | `tsx watch src/server.ts`         | Start development server with HMR    |
| `npm run build`           | `tsc -p tsconfig.build.json`      | Compile TypeScript for production    |
| `npm start`               | `node dist/server.js`             | Start production server              |
| `npm run typecheck`       | `tsc --noEmit`                    | Run type checking without emitting   |
| `npm run lint`            | `eslint src/`                     | Lint source files                    |
| `npm run lint:fix`        | `eslint src/ --fix`               | Lint and auto-fix                    |
| `npm run format`          | `prettier --write "src/**/*.ts"`  | Format source files                  |
| `npm run format:check`    | `prettier --check "src/**/*.ts"`  | Check formatting                     |
| `npm run prisma:generate` | `prisma generate`                 | Generate Prisma client               |
| `npm run prisma:migrate:dev` | `prisma migrate dev`           | Run migrations in development        |
| `npm run prisma:migrate:deploy` | `prisma migrate deploy`     | Deploy migrations to production      |
| `npm run prisma:migrate:reset` | `prisma migrate reset`       | Reset database and re-run migrations |
| `npm run prisma:studio`   | `prisma studio`                   | Open Prisma Studio GUI               |
| `npm run db:setup`        | Generate + migrate                | Full database setup                  |

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL connection string
   ```

3. **Generate Prisma client:**
   ```bash
   npm run prisma:generate
   ```

4. **Run database migrations:**
   ```bash
   npm run prisma:migrate:dev
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` with the health endpoint at `GET /api/v1/health`.

## API Endpoints

### Health Check

```
GET /api/v1/health
```

**Response:**

```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "appName": "auth0-authentication-system-express",
    "version": "1.0.0",
    "environment": "development",
    "status": "healthy",
    "timestamp": "2026-11-09T16:00:00.000Z"
  },
  "timestamp": "2026-11-09T16:00:00.000Z"
}
```

### Error Response Format

All errors follow a consistent structure:

```json
{
  "success": false,
  "message": "An error occurred",
  "error": {
    "code": "INTERNAL_SERVER_ERROR"
  },
  "timestamp": "2026-11-09T16:00:00.000Z"
}
```

## Architecture Overview

### Modular Design

The application follows a modular architecture where each domain concern is encapsulated in its own module under `src/modules/`. Each module contains:

- **Routes** — Express router definitions
- **Controller** — Request handling and response formatting
- **Service** — Business logic

### Configuration

All configuration is centralized in `src/config/` and validated at startup using Zod schemas. The application never accesses `process.env` directly in business logic — all environment values flow through the typed `appConfig` object.

### Error Handling

A centralized error handling architecture with:

- **`AppError`** — Custom error class with HTTP status codes and error codes
- **Error middleware** — Global Express error handler
- **Safe production messages** — Stack traces and internal details are hidden in production
- **Consistent response format** — All errors follow the same JSON structure

### Logging

Pino provides structured, high-performance logging with:

- JSON output in production, pretty-printed output in development
- Request correlation IDs via `X-Request-ID` header
- Automatic request/response logging via `pino-http`
- Sensitive field redaction (passwords, tokens, cookies, authorization headers)

### Database

Prisma ORM 7 with the PostgreSQL driver adapter provides:

- Type-safe database access
- Singleton client pattern
- Connection lifecycle management
- Graceful shutdown support

## Implementation Status

### ✅ Phase 1 — Foundation & Architecture (Current)

- Express 5 application foundation
- TypeScript strict configuration
- Zod-validated environment configuration
- Pino structured logging with redaction
- Prisma 7 with PostgreSQL driver adapter
- Health check endpoint
- Centralized error handling
- Request correlation IDs
- Graceful shutdown
- ESLint + Prettier configuration
- Modular project architecture

### 🔲 Phase 2 — Auth0 Integration (Planned)

- Auth0 SDK integration
- OAuth 2.0 / OpenID Connect flows
- JWT verification and JWKS
- Login and registration endpoints
- Authentication middleware

### 🔲 Phase 3 — Authorization & User Management (Planned)

- Role-based access control (RBAC)
- Permissions system
- User management endpoints
- Database models (User, Role, Permission)

### 🔲 Phase 4 — Production-Ready Capabilities (Planned)

- Advanced health checks and readiness probes
- Rate limiting
- Audit logging
- Performance monitoring
- Docker configuration

### 🔲 Phase 5 — Final Implementation (Planned)

- CI/CD pipelines
- Production deployment configuration
- Comprehensive testing
- Final documentation

---

**Current Progress: 1/5 phases completed**

