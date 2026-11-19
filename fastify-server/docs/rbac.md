# Role-Based Access Control (RBAC) Specification — Fastify Server

This document outlines the Role-Based Access Control (RBAC) model, system roles, permission definitions, and assignment policies implemented in `fastify-server`.

---

## 1. System Roles

The application defines 5 immutable system roles that cannot be deleted or renamed (`isSystem: true`):

| Role | Description | Privilege Scope |
|---|---|---|
| `SUPER_ADMIN` | Root system administrator | Wildcard (`*`) bypass across all authorization hooks |
| `ADMIN` | General system administrator | Full user, role, permission, audit, and dashboard authority |
| `MANAGER` | Operational supervisor | User management, user role assignment, dashboard read |
| `USER` | Standard application user | Profile self-management (`/users/me`), basic read access |
| `VIEWER` | Read-only auditor/inspector | Read-only visibility over users, roles, and dashboard |

---

## 2. Resource-Action Permissions Catalog

Permissions follow the standard `<resource>:<action>` format:

| Permission Name | Resource | Action | Description |
|---|---|---|---|
| `users:read` | `users` | `read` | Query and inspect user accounts |
| `users:create` | `users` | `create` | Provision new user accounts |
| `users:update` | `users` | `update` | Modify user account attributes and statuses |
| `users:delete` | `users` | `delete` | Soft or hard delete user accounts |
| `roles:read` | `roles` | `read` | List and inspect application roles |
| `roles:create` | `roles` | `create` | Define new custom roles |
| `roles:update` | `roles` | `update` | Update custom role names or descriptions |
| `roles:delete` | `roles` | `delete` | Remove unassigned custom roles |
| `roles:assign` | `roles` | `assign` | Assign or revoke roles for users |
| `permissions:read` | `permissions` | `read` | List available permissions |
| `permissions:manage` | `permissions` | `manage` | Update role-permission associations |
| `dashboard:read` | `dashboard` | `read` | Access administrative telemetry & metrics |
| `audit-logs:read` | `audit-logs` | `read` | Query system audit trails |

---

## 3. Role-Permission Matrix

| Permission | SUPER_ADMIN | ADMIN | MANAGER | USER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `users:read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `users:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `users:update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `users:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `roles:read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `roles:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `roles:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `roles:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `roles:assign` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `permissions:read`| ✅ | ✅ | ❌ | ❌ | ✅ |
| `permissions:manage`| ✅ | ✅ | ❌ | ❌ | ❌ |
| `dashboard:read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `audit-logs:read` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 4. Protection & Integrity Rules

1. **System Role Protection**: System roles (`isSystem: true`) cannot be deleted or renamed. Attempts to delete or alter the name of a system role return `403 Forbidden` (`SYSTEM_ROLE_PROTECTED`).
2. **Lockout Prevention**: A user assigned the `SUPER_ADMIN` role cannot revoke their own `SUPER_ADMIN` role. Attempts return `403 Forbidden` (`FORBIDDEN`).
3. **Active Role Enforcement**: Only active roles (`isActive: true`) can be assigned to users. Inactive role assignments return `400 Bad Request`.
4. **Duplicate Assignment Prevention**: Assigning an already-assigned role returns `409 Conflict` (`DUPLICATE_ROLE_ASSIGNMENT`).
5. **Assigned Role Deletion Safeguard**: A role cannot be deleted if any users are currently assigned to it.
