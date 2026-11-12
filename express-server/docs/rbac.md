# Role-Based Access Control (RBAC) Specification

This document defines the Role-Based Access Control (RBAC) model, system roles, granular permissions, and assignment rules for the `auth0-authentication-system` platform.

## 1. System Roles

The system is seeded with five immutable system roles:

| Role | Name Constant | Description | Protected |
|------|---------------|-------------|:---------:|
| **Super Administrator** | `SUPER_ADMIN` | Global root administrator with unrestricted access across all resources and bypassing authorization gates. | Yes |
| **Administrator** | `ADMIN` | Application administrator with capabilities to manage users, roles, permissions, and view system metrics. | Yes |
| **Manager** | `MANAGER` | Resource manager with elevated permissions to review users, inspect roles, and view administrative dashboards. | Yes |
| **User** | `USER` | Standard registered user with profile self-management capabilities. Default role assigned upon initial registration. | Yes |
| **Viewer** | `VIEWER` | Read-only user with minimal viewing access to public and assigned resources. | Yes |

---

## 2. Granular Permissions Catalog

Permissions follow the standard `resource:action` convention:

| Permission Identifier | Constant Name | Description |
|-----------------------|---------------|-------------|
| `users:read` | `PERMISSIONS.USERS_READ` | View user records, search users, inspect user details. |
| `users:create` | `PERMISSIONS.USERS_CREATE` | Provision or register new users manually. |
| `users:update` | `PERMISSIONS.USERS_UPDATE` | Update user metadata, activate/deactivate, or block users. |
| `users:delete` | `PERMISSIONS.USERS_DELETE` | Delete or archive user records. |
| `roles:read` | `PERMISSIONS.ROLES_READ` | View role listings, role details, and assigned permissions. |
| `roles:create` | `PERMISSIONS.ROLES_CREATE` | Create custom application roles. |
| `roles:update` | `PERMISSIONS.ROLES_UPDATE` | Update custom role metadata and active status. |
| `roles:delete` | `PERMISSIONS.ROLES_DELETE` | Remove custom application roles. |
| `roles:assign` | `PERMISSIONS.ROLES_ASSIGN` | Assign roles to users or revoke roles from users. |
| `permissions:read` | `PERMISSIONS.PERMISSIONS_READ` | View catalog of system permissions and role mappings. |
| `permissions:manage` | `PERMISSIONS.PERMISSIONS_MANAGE` | Modify role-to-permission mappings in bulk. |
| `dashboard:read` | `PERMISSIONS.DASHBOARD_READ` | View administrative dashboards and system metrics. |
| `audit-logs:read` | `PERMISSIONS.AUDIT_LOGS_READ` | View audit logging and activity logs (Phase 4). |

---

## 3. Default Role-Permission Matrix

| Permission | `SUPER_ADMIN` | `ADMIN` | `MANAGER` | `USER` | `VIEWER` |
|------------|:-------------:|:-------:|:---------:|:------:|:--------:|
| `users:read` | All | Yes | Yes | Own | Own |
| `users:create` | All | Yes | No | No | No |
| `users:update` | All | Yes | No | Own | No |
| `users:delete` | All | Yes | No | No | No |
| `roles:read` | All | Yes | Yes | No | No |
| `roles:create` | All | Yes | No | No | No |
| `roles:update` | All | Yes | No | No | No |
| `roles:delete` | All | Yes | No | No | No |
| `roles:assign` | All | Yes | No | No | No |
| `permissions:read` | All | Yes | Yes | No | No |
| `permissions:manage` | All | Yes | No | No | No |
| `dashboard:read` | All | Yes | Yes | No | No |
| `audit-logs:read` | All | Yes | No | No | No |

---

## 4. Role Lifecycle & Management

### Creating Custom Roles
- Any user holding `roles:create` can create new application roles via `POST /api/v1/roles`.
- Role names must follow the `^[A-Z0-9_]+$` uppercase naming convention.
- New roles can optionally be created with an initial array of permission IDs.
- Custom roles are created with `isSystem: false`.

### Modifying Roles
- Custom roles can have their `name`, `description`, and `isActive` fields updated.
- System roles (`isSystem: true`) have their `name` locked. Attempting to rename a system role returns `403 Forbidden` (`SYSTEM_ROLE_PROTECTED`).

### Deleting Roles
- System roles can never be deleted (`SYSTEM_ROLE_PROTECTED`).
- Custom roles currently assigned to users cannot be deleted until all user assignments are revoked (`400 Bad Request`).
- Deleting a role cascades and deletes all associated records in `role_permissions`.

### Role Assignment & Revocation
- Users holding `roles:assign` can assign roles using `POST /api/v1/users/:id/roles`.
- Duplicate role assignments are prevented (`409 Conflict`, `DUPLICATE_ROLE_ASSIGNMENT`).
- Roles can be revoked using `DELETE /api/v1/users/:id/roles/:roleId`.
- **Self-lockout prevention**: A user with `SUPER_ADMIN` cannot revoke their own `SUPER_ADMIN` role (`403 Forbidden`).

