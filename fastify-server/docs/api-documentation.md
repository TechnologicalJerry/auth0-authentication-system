# API Reference Documentation — Fastify Server

This document provides a comprehensive reference for all REST API endpoints exposed by the `fastify-server` application in the `auth0-authentication-system`.

## Global Standards

- **Base URL**: `http://localhost:4000` (configurable via `APP_PORT`)
- **API Prefix**: `/api/v1` (for domain endpoints)
- **Content Type**: `application/json; charset=utf-8`
- **Correlation ID**: Every response includes an `X-Request-ID` header matching the incoming request or an auto-generated UUIDv4.
- **Envelope Format**:
  - Success responses:
    ```json
    {
      "success": true,
      "statusCode": 200,
      "message": "Operation completed successfully.",
      "data": { ... },
      "timestamp": "2026-11-17T12:00:00.000Z"
    }
    ```
  - Error responses:
    ```json
    {
      "success": false,
      "statusCode": 401,
      "errorCode": "AUTHENTICATION_FAILED",
      "message": "Bearer token is missing or malformed.",
      "timestamp": "2026-11-17T12:00:00.000Z",
      "path": "/api/v1/users/me",
      "requestId": "a8f3b204-c5a1-4e78-9e12-d4b971a93b21"
    }
    ```

---

## Rate Limiting & Quotas

All protected and sensitive endpoints enforce distributed rate limits backed by Redis with IETF standard headers:
- `RateLimit-Limit`: Maximum requests per window
- `RateLimit-Remaining`: Remaining allowance in current window
- `RateLimit-Reset`: Seconds until quota resets

| Tier | Window | Limit | Target Endpoints |
|---|---|---|---|
| **Global** | 60s | 100 req | Default fallback |
| **Auth** | 60s | 20 req | `/api/v1/auth/*` |
| **Admin** | 60s | 30 req | `/api/v1/admin/*`, `/api/v1/audit-logs/*`, role assignments |

---

## 1. System & Health Endpoints

### 1.1 Liveness Probe
- **Method**: `GET`
- **Path**: `/health/live` (also `/live`)
- **Auth**: None
- **Rate Limit**: Exempt
- **Success (200)**:
  ```json
  {
    "status": "ok",
    "uptime": 124.5,
    "timestamp": "2026-11-17T12:00:00.000Z"
  }
  ```

### 1.2 Readiness Probe
- **Method**: `GET`
- **Path**: `/health/ready` (also `/ready`)
- **Auth**: None
- **Rate Limit**: Exempt
- **Success (200)** / **Degraded (503)**:
  ```json
  {
    "status": "ready",
    "database": "connected",
    "redis": "connected",
    "timestamp": "2026-11-17T12:00:00.000Z"
  }
  ```

### 1.3 Detailed Dependency Health
- **Method**: `GET`
- **Path**: `/health/dependencies`
- **Auth**: None
- **Rate Limit**: Exempt
- **Success (200)** / **Degraded (503)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Health check completed.",
    "data": {
      "status": "healthy",
      "checks": {
        "database": {
          "status": "healthy",
          "latencyMs": 2
        },
        "redis": {
          "status": "healthy",
          "latencyMs": 1
        }
      },
      "uptime": 3600.2,
      "timestamp": "2026-11-17T12:00:00.000Z"
    }
  }
  ```

### 1.4 OpenAPI / Swagger UI
- **Interactive Documentation**: `GET /docs`
- **OpenAPI 3.0.3 Specification**: `GET /openapi.json`

---

## 2. Authentication Module

### 2.1 Authentication Status
Inspects whether the caller provided a valid Auth0 bearer token.
- **Method**: `GET`
- **Path**: `/api/v1/auth/status`
- **Auth**: Optional (`optionalAuthenticate`)
- **Rate Limit**: Auth tier (20 req / 60s)
- **Response (Unauthenticated - 200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Authentication status retrieved.",
    "data": {
      "isAuthenticated": false,
      "user": null
    }
  }
  ```
- **Response (Authenticated - 200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Authentication status retrieved.",
    "data": {
      "isAuthenticated": true,
      "user": {
        "sub": "auth0|64f1a2b3c4d5e6f7a8b9c0d1",
        "email": "developer@example.com",
        "roles": ["ADMIN"],
        "permissions": ["users:read", "users:write"]
      }
    }
  }
  ```

### 2.2 Token Claims & JIT Provisioning Check
Validates token against Auth0 JWKS, verifies issuer/audience, synchronizes application user, and returns mapped profile.
- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Auth**: Mandatory (`authenticate`)
- **Headers**: `Authorization: Bearer <auth0_access_token>`
- **Rate Limit**: Auth tier (20 req / 60s)
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Token validated successfully.",
    "data": {
      "token": {
        "issuer": "https://dev-tenant.auth0.com/",
        "subject": "auth0|64f1a2b3c4d5e6f7a8b9c0d1",
        "audience": "https://api.example.com",
        "expiresAt": 1795000000,
        "issuedAt": 1794913600
      },
      "user": {
        "sub": "auth0|64f1a2b3c4d5e6f7a8b9c0d1",
        "email": "developer@example.com",
        "emailVerified": true,
        "roles": ["ADMIN"],
        "permissions": ["users:read", "users:write"],
        "scopes": ["openid", "profile", "email"]
      }
    }
  }
  ```

---

## 3. Users Module

### 3.1 Get Current User Profile
Returns the database profile, assigned roles, and aggregated permissions for the authenticated caller.
- **Method**: `GET`
- **Path**: `/api/v1/users/me`
- **Auth**: Mandatory (`authenticate`)
- **Headers**: `Authorization: Bearer <auth0_access_token>`
- **Rate Limit**: Global tier (100 req / 60s)
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Current user profile retrieved successfully.",
    "data": {
      "id": "c7a8b9c0-d1e2-4f3a-8b9c-0d1e2f3a4b5c",
      "auth0Id": "auth0|64f1a2b3c4d5e6f7a8b9c0d1",
      "email": "developer@example.com",
      "username": "developer",
      "name": "Jane Developer",
      "picture": "https://cdn.example.com/avatar.png",
      "status": "ACTIVE",
      "lastLoginAt": "2026-11-17T11:45:00.000Z",
      "roles": ["ADMIN"],
      "permissions": ["users:read", "users:write", "roles:read", "audit:read"]
    }
  }
  ```

### 3.2 Update Current User Profile
Updates self mutable profile fields (`name`, `picture`).
- **Method**: `PATCH`
- **Path**: `/api/v1/users/me`
- **Auth**: Mandatory (`authenticate`)
- **Body**:
  ```json
  {
    "name": "Jane Doe",
    "picture": "https://cdn.example.com/new-avatar.png"
  }
  ```
- **Response (200)**: Returns updated `ApplicationUser` entity.

### 3.3 List Users (Paginated & Filtered)
- **Method**: `GET`
- **Path**: `/api/v1/users`
- **Auth**: Mandatory (`authenticate`) + Permission: `users:read`
- **Query Parameters**:
  - `page` (optional, integer, default: 1)
  - `limit` (optional, integer, default: 20, max: 100)
  - `search` (optional, string, searches email, name, username)
  - `status` (optional, `ACTIVE` | `SUSPENDED` | `DEACTIVATED`)
  - `roleId` (optional, UUID)
- **Response (200)**: Paginated user summaries with total counts and pagination metadata.

### 3.4 Get User By ID
- **Method**: `GET`
- **Path**: `/api/v1/users/:id`
- **Auth**: Mandatory (`authenticate`) + Permission: `users:read`
- **Response (200)**: Comprehensive user profile with roles, permissions, and timestamps.

### 3.5 Update User Status
- **Method**: `PATCH`
- **Path**: `/api/v1/users/:id/status`
- **Auth**: Mandatory (`authenticate`) + Permission: `users:write`
- **Body**:
  ```json
  {
    "status": "SUSPENDED"
  }
  ```
- **Response (200)**: Updated user status. Invalidates Redis cache for user context.

### 3.6 Assign/Replace User Roles
- **Method**: `PUT`
- **Path**: `/api/v1/users/:id/roles`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:assign`
- **Body**:
  ```json
  {
    "roleIds": [
      "d2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d"
    ]
  }
  ```
- **Safeguards**:
  - Prevents non-SUPER_ADMIN from granting `SUPER_ADMIN`.
  - Prevents revoking the last remaining `SUPER_ADMIN` in the system (lockout guard).
- **Response (200)**: Updated roles collection. Evicts user authorization cache and logs audit record.

---

## 4. Roles Module

### 4.1 List All Roles
- **Method**: `GET`
- **Path**: `/api/v1/roles`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:read`
- **Response (200)**: List of roles with permission count and user count.

### 4.2 Create Custom Role
- **Method**: `POST`
- **Path**: `/api/v1/roles`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:write`
- **Body**:
  ```json
  {
    "name": "AUDITOR",
    "description": "Security compliance and audit log reader",
    "permissionIds": ["b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"]
  }
  ```
- **Response (201)**: Created role entity.

### 4.3 Get Role Details
- **Method**: `GET`
- **Path**: `/api/v1/roles/:id`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:read`
- **Response (200)**: Role with full permission definitions.

### 4.4 Update Role
- **Method**: `PATCH`
- **Path**: `/api/v1/roles/:id`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:write`
- **Body**:
  ```json
  {
    "description": "Updated auditor description"
  }
  ```
- **Safeguards**: System roles cannot have their `name` mutated.

### 4.5 Delete Role
- **Method**: `DELETE`
- **Path**: `/api/v1/roles/:id`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:delete`
- **Safeguards**:
  - System roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`, `VIEWER`) cannot be deleted.
  - Roles currently assigned to users cannot be deleted without first unassigning users.

### 4.6 Set Role Permissions (Atomic Bulk Update)
- **Method**: `PUT`
- **Path**: `/api/v1/roles/:id/permissions`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:write`
- **Body**:
  ```json
  {
    "permissionIds": [
      "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "c2b3a4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6e"
    ]
  }
  ```
- **Response (200)**: Updated role permissions. Evicts cached user contexts for all members of this role.

---

## 5. Permissions Module

### 5.1 List All System Permissions
- **Method**: `GET`
- **Path**: `/api/v1/permissions`
- **Auth**: Mandatory (`authenticate`) + Permission: `roles:read`
- **Response (200)**: Catalog of 13 granular permissions grouped by resource (`users`, `roles`, `permissions`, `audit`, `metrics`).

---

## 6. Audit Logs Module

### 6.1 Query Audit Logs (Paginated & Filtered)
- **Method**: `GET`
- **Path**: `/api/v1/audit-logs`
- **Auth**: Mandatory (`authenticate`) + Permission: `audit:read`
- **Rate Limit**: Admin tier (30 req / 60s)
- **Query Parameters**:
  - `page` (optional, default: 1)
  - `limit` (optional, default: 20, max: 100)
  - `action` (optional, e.g. `USER_ROLE_ASSIGNED`, `USER_STATUS_UPDATED`)
  - `userId` (optional, filter by actor)
  - `targetId` (optional, filter by subject)
  - `startDate` (optional, ISO 8601)
  - `endDate` (optional, ISO 8601)
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Audit logs retrieved successfully.",
    "data": {
      "items": [
        {
          "id": "f1e2d3c4-b5a6-4f7e-8d9c-0b1a2f3e4d5c",
          "action": "USER_ROLE_ASSIGNED",
          "userId": "c7a8b9c0-d1e2-4f3a-8b9c-0d1e2f3a4b5c",
          "targetId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
          "targetType": "USER",
          "ipAddress": "192.168.1.50",
          "userAgent": "Mozilla/5.0 ...",
          "metadata": {
            "previousRoleIds": [],
            "newRoleIds": ["d2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c6d"]
          },
          "createdAt": "2026-11-17T12:05:00.000Z"
        }
      ],
      "meta": {
        "page": 1,
        "limit": 20,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

### 6.2 Get Single Audit Log Entry
- **Method**: `GET`
- **Path**: `/api/v1/audit-logs/:id`
- **Auth**: Mandatory (`authenticate`) + Permission: `audit:read`
- **Rate Limit**: Admin tier (30 req / 60s)
- **Response (200)**: Audit log details.

---

## 7. Admin & Metrics Module

### 7.1 System Dashboard Overview
- **Method**: `GET`
- **Path**: `/api/v1/admin/dashboard`
- **Auth**: Mandatory (`authenticate`) + Permission: `metrics:read` (or Role: `SUPER_ADMIN`, `ADMIN`)
- **Rate Limit**: Admin tier (30 req / 60s)
- **Response (200)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Admin dashboard statistics retrieved successfully.",
    "data": {
      "users": {
        "total": 150,
        "active": 142,
        "suspended": 6,
        "deactivated": 2
      },
      "roles": {
        "total": 5,
        "custom": 0
      },
      "auditLogs": {
        "total": 1420
      },
      "system": {
        "nodeVersion": "v26.0.0",
        "memoryUsage": {
          "rss": "85MB",
          "heapTotal": "48MB",
          "heapUsed": "32MB"
        },
        "uptime": 86400
      }
    }
  }
  ```

### 7.2 User Statistics
- **Method**: `GET`
- **Path**: `/api/v1/admin/users/statistics`
- **Auth**: Mandatory (`authenticate`) + Role: `SUPER_ADMIN` or `ADMIN`
- **Response (200)**: Status distribution, recent registrations, and activity metrics.

### 7.3 Role Statistics
- **Method**: `GET`
- **Path**: `/api/v1/admin/roles/statistics`
- **Auth**: Mandatory (`authenticate`) + Role: `SUPER_ADMIN` or `ADMIN`
- **Response (200)**: Distribution of users per role.
