# Authorization & RBAC Architecture

This document details the authorization architecture, user synchronization, role-based access control (RBAC), and permission management implemented in the `express-server` application.

## 1. Architectural Philosophy

Our platform maintains a strict separation of concerns between **Authentication** and **Authorization**:

- **Auth0 (Identity Provider)**: Manages identity, credentials, multi-factor authentication (MFA), social logins, user password hashing, and token issuance.
- **Express Backend (Resource Server & Policy Authority)**: Validates incoming Auth0 JWT tokens, synchronizes application-side user profiles, and enforces fine-grained authorization policies (roles and permissions).

```
   Frontend Client
         │
         │ (1) Authenticate with Auth0
         ▼
    Auth0 Tenant
         │
         │ (2) Issues RS256 JWT Access Token
         ▼
   Express Backend
         │
         │ (3) authenticate middleware verifies JWT via Auth0 JWKS
         ▼
   User Synchronization
         │
         │ (4) Upsert ApplicationUser & resolve active roles/permissions
         ▼
   Authorization Middleware
         │
         │ (5) authorizeRole() or authorizePermission()
         ▼
   Controller / Business Logic
```

---

## 2. Request Lifecycle & User Synchronization

Every authenticated request undergoes the following lifecycle:

1. **Token Extraction**: The `authenticate` middleware inspects `req.headers.authorization` for the `Bearer <token>` format.
2. **Cryptographic Verification**: The `jose` verifier validates the RS256 signature, issuer (`iss`), audience (`aud`), expiration (`exp`), and active window (`nbf`).
3. **Identity Extraction**: The verified payload (`sub`, scopes, claims) is assigned to `req.auth`.
4. **User Synchronization (`syncAuth0User`)**:
   - The user's external identity `auth0UserId` (from `sub`) is queried in the PostgreSQL database.
   - If not found, a new `ApplicationUser` record is created (JIT provisioning) and assigned the default `USER` role.
   - If found, profile claims (e.g. `lastLoginAt`, `emailVerified`) are synchronized.
   - The user's account state is verified:
     - `isActive === false`: Throws `403 Forbidden` (`USER_INACTIVE`).
     - `isBlocked === true`: Throws `403 Forbidden` (`USER_BLOCKED`).
   - Active roles and all distinct permissions mapped to those roles are aggregated.
   - The resulting strongly typed context is attached to `req.currentUser`.
5. **Authorization Enforcement**: Route-specific middleware (`authorizeRole` or `authorizePermission`) checks the user's rights.
6. **Execution**: The controller executes domain logic.

---

## 3. Database Schema & Authorization Models

The database models are configured in `prisma/schema.prisma` with UUID primary keys and strict relational integrity:

```
┌──────────────────┐            ┌──────────────────┐            ┌──────────────────┐
│ ApplicationUser  │ 1        * │     UserRole     │ *        1 │       Role       │
│──────────────────│────────────│──────────────────│────────────│──────────────────│
│ id (UUID, PK)    │            │ id (UUID, PK)    │            │ id (UUID, PK)    │
│ auth0UserId (UQ) │            │ userId (FK)      │            │ name (UQ)        │
│ email (UQ)       │            │ roleId (FK)      │            │ isSystem (Bool)  │
│ isActive (Bool)  │            │ assignedAt       │            │ isActive (Bool)  │
│ isBlocked (Bool) │            └──────────────────┘            └─────────┬────────┘
└──────────────────┘                                                      │ 1
                                                                          │
                                                                          │ *
                                                                ┌─────────┴────────┐
                                                                │  RolePermission  │
                                                                │──────────────────│
                                                                │ id (UUID, PK)    │
                                                                │ roleId (FK)      │
                                                                │ permissionId(FK) │
                                                                └─────────┬────────┘
                                                                          │ *
                                                                          │
                                                                          │ 1
                                                                ┌─────────┴────────┐
                                                                │    Permission    │
                                                                │──────────────────│
                                                                │ id (UUID, PK)    │
                                                                │ name (UQ)        │
                                                                │ description      │
                                                                └──────────────────┘
```

### Relational Constraints
- **User Deletion**: Cascades to `UserRole`.
- **Role Deletion**: Restricted if users are currently assigned (`onDelete: Restrict`). Cascades to `RolePermission`.
- **System Roles**: Protected by software policies (`isSystem: true`) preventing deletion or name mutation.
- **Unique Compound Keys**: `@@unique([userId, roleId])` and `@@unique([roleId, permissionId])` prevent duplicate assignments.

---

## 4. Authorization Middleware Specifications

### `authorizeRole(...roles: (SystemRole | string)[])`
- Checks whether `req.currentUser.roles` includes at least one of the specified roles.
- `SUPER_ADMIN` has global authority and automatically passes role checks.
- Unauthenticated requests yield `401 Unauthorized` (`AUTHENTICATION_REQUIRED`).
- Unauthorized requests yield `403 Forbidden` (`INSUFFICIENT_ROLE`).

### `authorizePermission(permission: PermissionName | string)`
- Verifies that `req.currentUser.permissions` contains the specified permission.
- `SUPER_ADMIN` automatically passes all permission checks.
- Evaluates in `AND` mode by default.

### `authorizePermissions({ permissions: string[], mode: 'AND' | 'OR' })`
- Evaluates multi-permission rules with either conjunction (`AND`) or disjunction (`OR`).
- Fails closed (deny-by-default).

---

## 5. Security & Isolation Controls

1. **Deny-by-Default**: Missing roles, missing permissions, or inactive roles grant zero privileges.
2. **Lockout Prevention**: A user holding the `SUPER_ADMIN` role cannot revoke their own `SUPER_ADMIN` role.
3. **Protected Account Fields**: Regular users updating `/users/me` can only modify profile metadata (`firstName`, `lastName`, `displayName`, `profilePicture`). They cannot change `email`, `isActive`, `isBlocked`, or role assignments.
4. **IDOR & Mass Assignment Prevention**: User updates and role assignments use validated Zod DTOs; database primary keys and status fields are guarded.
5. **Phase 4 Redis Cache Readiness**: Authorization context resolution in `users.repository.ts` is encapsulated in `getUserContext()`, allowing seamless drop-in Redis caching in Phase 4 without modifying route handlers or middleware.

