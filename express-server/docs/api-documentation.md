# Express API Documentation

All API routes are prefixed by `/api/v1`. All protected endpoints require a valid Auth0 JWT passed in the HTTP header:
`Authorization: Bearer <access_token>`.

---

## 1. Health Endpoints

### `GET /api/v1/health`
Checks application health and execution state.

- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "appName": "auth0-authentication-system-express",
    "version": "1.0.0",
    "environment": "development",
    "status": "healthy",
    "timestamp": "2026-11-14T22:00:00.000Z"
  },
  "timestamp": "2026-11-14T22:00:00.000Z"
}
```

### `GET /api/v1/health/live`
Kubernetes/Docker liveness probe indicating the Node.js process is alive.

- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Service is live",
  "data": {
    "status": "live",
    "uptimeSeconds": 1420,
    "memoryUsage": {
      "rssMb": 64,
      "heapUsedMb": 32,
      "heapTotalMb": 48
    },
    "timestamp": "2026-11-14T22:00:00.000Z"
  },
  "timestamp": "2026-11-14T22:00:00.000Z"
}
```

### `GET /api/v1/health/ready`
Kubernetes/Docker readiness probe checking whether dependencies can accept traffic.

- **Auth**: None
- **Response**: `200 OK` (or `503 Service Unavailable` if database is down)
```json
{
  "success": true,
  "message": "Service is ready",
  "data": {
    "ready": true,
    "status": "ready",
    "components": {
      "database": { "status": "healthy" },
      "redis": { "status": "healthy" }
    },
    "timestamp": "2026-11-14T22:00:00.000Z"
  },
  "timestamp": "2026-11-14T22:00:00.000Z"
}
```

### `GET /api/v1/health/dependencies`
Diagnostic dependency response times and configuration metrics.

- **Auth**: None
- **Response**: `200 OK` (or `503 Service Unavailable` if critical failure)
```json
{
  "success": true,
  "message": "Dependency status retrieved",
  "data": {
    "status": "healthy",
    "dependencies": {
      "database": {
        "provider": "postgresql",
        "status": "healthy",
        "latencyMs": 4
      },
      "redis": {
        "provider": "redis",
        "status": "healthy",
        "latencyMs": 1
      },
      "auth0": {
        "provider": "auth0",
        "status": "configured",
        "domain": "your-tenant.auth0.com",
        "audience": "https://your-api-identifier",
        "note": "Local JWT validation and JWKS caching ready"
      }
    },
    "timestamp": "2026-11-14T22:00:00.000Z"
  },
  "timestamp": "2026-11-14T22:00:00.000Z"
}
```

---

## 2. Authentication Endpoints

### `GET /api/v1/auth/status`
Returns Auth0 integration configuration status.

- **Auth**: None
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Auth0 integration status",
  "data": {
    "provider": "Auth0",
    "configured": true,
    "domain": "your-tenant.auth0.com",
    "audience": "https://your-api-identifier"
  },
  "timestamp": "2026-11-10T22:00:00.000Z"
}
```

### `GET /api/v1/auth/me`
Returns verified identity claims and application user context.

- **Auth**: Required
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Authenticated user retrieved successfully",
  "data": {
    "sub": "auth0|64abc123def456",
    "issuer": "https://your-tenant.auth0.com/",
    "scopes": ["openid", "profile", "email"],
    "permissions": ["users:read", "dashboard:read"],
    "roles": ["USER"],
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "displayName": "Jane Doe"
    }
  },
  "timestamp": "2026-11-10T22:00:00.000Z"
}
```

---

## 3. User Management Endpoints

### `GET /api/v1/users/me`
Retrieves the current user's profile and permissions.

- **Auth**: Required
- **Response**: `200 OK`

### `PATCH /api/v1/users/me`
Updates editable profile fields of the currently logged-in user.

- **Auth**: Required
- **Body**:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "displayName": "Jane D.",
  "profilePicture": "https://example.com/avatar.png"
}
```
- **Response**: `200 OK`

### `GET /api/v1/users`
Lists application users with pagination, filtering, and search.

- **Auth**: Required (`users:read`)
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `search` (string)
  - `isActive` (boolean: `true` / `false`)
  - `isBlocked` (boolean: `true` / `false`)
  - `role` (string)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "auth0UserId": "auth0|64abc123def456",
        "email": "user@example.com",
        "emailVerified": true,
        "firstName": "Jane",
        "lastName": "Doe",
        "displayName": "Jane Doe",
        "profilePicture": null,
        "isActive": true,
        "isBlocked": false,
        "lastLoginAt": "2026-11-10T21:45:00.000Z",
        "createdAt": "2026-11-01T10:00:00.000Z",
        "updatedAt": "2026-11-10T21:45:00.000Z",
        "roles": ["USER"]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  },
  "timestamp": "2026-11-10T22:00:00.000Z"
}
```

### `GET /api/v1/users/:id`
Retrieves a single user by internal UUID.

- **Auth**: Required (`users:read`)
- **Response**: `200 OK`

### `PATCH /api/v1/users/:id`
Updates a user's details as an administrator.

- **Auth**: Required (`users:update`)
- **Body**:
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "isActive": true,
  "isBlocked": false
}
```
- **Response**: `200 OK`

### `PATCH /api/v1/users/:id/status`
Toggles account status (active or blocked).

- **Auth**: Required (`users:update`)
- **Body**:
```json
{
  "isBlocked": true
}
```
- **Response**: `200 OK`

### `POST /api/v1/users/:id/roles`
Assigns a role to a user.

- **Auth**: Required (`roles:assign`)
- **Body**:
```json
{
  "roleId": "234e5678-e89b-12d3-a456-426614174000"
}
```
- **Response**: `201 Created`

### `DELETE /api/v1/users/:id/roles/:roleId`
Revokes a role from a user.

- **Auth**: Required (`roles:assign`)
- **Response**: `200 OK`

---

## 4. Role Management Endpoints

### `GET /api/v1/roles`
Lists all roles with permission lists and assigned user counts.

- **Auth**: Required (`roles:read`)
- **Response**: `200 OK`

### `GET /api/v1/roles/:id`
Retrieves role details by UUID.

- **Auth**: Required (`roles:read`)
- **Response**: `200 OK`

### `POST /api/v1/roles`
Creates a new custom application role.

- **Auth**: Required (`roles:create`)
- **Body**:
```json
{
  "name": "SUPPORT_AGENT",
  "description": "Customer support representative",
  "permissionIds": ["345e6789-e89b-12d3-a456-426614174000"]
}
```
- **Response**: `201 Created`

### `PATCH /api/v1/roles/:id`
Updates custom role metadata.

- **Auth**: Required (`roles:update`)
- **Body**:
```json
{
  "description": "Updated description",
  "isActive": true
}
```
- **Response**: `200 OK`

### `DELETE /api/v1/roles/:id`
Deletes a custom application role (system roles cannot be deleted; roles with active users cannot be deleted).

- **Auth**: Required (`roles:delete`)
- **Response**: `200 OK`

### `GET /api/v1/roles/:id/permissions`
Lists all permissions assigned to a role.

- **Auth**: Required (`permissions:read`)
- **Response**: `200 OK`

### `PUT /api/v1/roles/:id/permissions`
Atomically replaces all permissions assigned to a role.

- **Auth**: Required (`permissions:manage`)
- **Body**:
```json
{
  "permissionIds": [
    "345e6789-e89b-12d3-a456-426614174000",
    "456e789a-e89b-12d3-a456-426614174000"
  ]
}
```
- **Response**: `200 OK`

---

## 5. Permissions Catalog Endpoints

### `GET /api/v1/permissions`
Lists all system resource-action permissions.

- **Auth**: Required (`permissions:read`)
- **Response**: `200 OK`

---

## 6. Admin Endpoints

### `GET /api/v1/admin/dashboard`
Aggregated system statistics and health metrics.

- **Auth**: Required (`SUPER_ADMIN` or `ADMIN`)
- **Response**: `200 OK`

### `GET /api/v1/admin/users/statistics`
Detailed user distribution metrics, active/blocked counts, and role breakdowns.

- **Auth**: Required (`SUPER_ADMIN` or `ADMIN`)
- **Response**: `200 OK`

### `GET /api/v1/admin/roles/statistics`
Breakdown of custom vs system roles, assigned users, and permissions per role.

- **Auth**: Required (`SUPER_ADMIN` or `ADMIN`)
- **Response**: `200 OK`

---

## 7. Audit Logging Endpoints

### `GET /api/v1/audit-logs`
Lists security and administrative audit log records with pagination and multi-parameter filtering.

- **Auth**: Required (`audit-logs:read`)
- **Query Parameters**:
  - `page` (number, default: 1)
  - `limit` (number, default: 20, max: 100)
  - `actorUserId` (UUID)
  - `action` (string, e.g. `ROLE_ASSIGNED`, `USER_STATUS_UPDATED`)
  - `resource` (string, e.g. `user`, `role`)
  - `resourceId` (string)
  - `status` (string: `SUCCESS` or `FAILURE`)
  - `correlationId` (string)
  - `startDate` (ISO-8601 date string)
  - `endDate` (ISO-8601 date string)
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Audit logs retrieved successfully",
  "data": {
    "items": [
      {
        "id": "456e789a-e89b-12d3-a456-426614174000",
        "actorUserId": "123e4567-e89b-12d3-a456-426614174000",
        "actor": {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "email": "admin@example.com",
          "displayName": "Admin User"
        },
        "action": "ROLE_ASSIGNED",
        "resource": "user_role",
        "resourceId": "234e5678-e89b-12d3-a456-426614174000:345e6789-e89b-12d3-a456-426614174000",
        "status": "SUCCESS",
        "ipAddress": "127.0.0.1",
        "userAgent": "Mozilla/5.0",
        "correlationId": "550e8400-e29b-41d4-a716-446655440000",
        "metadata": {
          "userId": "234e5678-e89b-12d3-a456-426614174000",
          "roleName": "ADMIN"
        },
        "createdAt": "2026-11-14T21:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  },
  "timestamp": "2026-11-14T22:00:00.000Z"
}
```

### `GET /api/v1/audit-logs/:id`
Retrieves a single audit log entry by UUID.

- **Auth**: Required (`audit-logs:read`)
- **Response**: `200 OK`

---

## 8. Swagger & OpenAPI Documentation Endpoints

### `GET /api/v1/docs`
Interactive Swagger UI interface documenting all API schemas, security requirements, and endpoints.
*(Enabled via `SWAGGER_ENABLED=true`)*

- **Auth**: Public

### `GET /api/v1/openapi.json`
Machine-readable OpenAPI 3.0.3 specification in JSON format.

- **Auth**: Public

