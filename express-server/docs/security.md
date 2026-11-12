# Security Architecture & Hardening

This document outlines the security controls, hardening measures, and threat mitigation strategies implemented in the `auth0-authentication-system` Express backend.

---

## 1. HTTP Security Hardening (Helmet)

Helmet is configured to manage security-related HTTP response headers:

- **Content Security Policy (CSP)**:
  - Default source restricted to `'self'`.
  - Script & style sources allow `'unsafe-inline'` to accommodate Swagger UI styling.
  - Image sources permit `'self'`, `data:`, and `https:` for avatar displays.
- **Cross-Origin Resource Policy (CORP)**: Set to `cross-origin` to support multi-client frontend architectures.
- **Header Masking**: Removes `X-Powered-By` to prevent framework fingerprinting.
- **XSS & Sniffing Protection**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security` (HSTS) in production deployments.

---

## 2. Cross-Origin Resource Sharing (CORS)

Cross-Origin Resource Sharing is strictly constrained:

- **Explicit Origin Allowlist**: Configured via `CORS_ALLOWED_ORIGINS` (defaults: `http://localhost:3000` for Next.js, `http://localhost:4200` for Angular, `http://localhost:5173` for Vue).
- **Non-Browser Clients**: Requests with no `Origin` header (such as curl, mobile clients, and internal server-to-server traffic) are accepted.
- **Allowed Methods**: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`.
- **Allowed Headers**: `Content-Type`, `Authorization`, `X-Request-ID`.
- **Exposed Headers**: Rate-limit headers and `X-Request-ID`.
- **Credentials**: `credentials: true` enables authenticated cookie and token exchange.
- **Preflight Caching**: Preflight OPTIONS responses are cached for 24 hours (`maxAge: 86400`) to minimize roundtrips.

---

## 3. Reverse Proxy & IP Address Security

In modern containerized and cloud environments, Express runs behind ingress controllers, load balancers, or API gateways.

- **Configured Trust Proxy**:
  - Managed via `TRUST_PROXY` (default: `'loopback, linklocal, uniquelocal'`).
  - Express does not blindly trust `X-Forwarded-For` from arbitrary untrusted networks.
- **Rate Limiting Security**: Rate limits use `req.ip`, derived securely through the configured trust proxy rules, preventing spoofed IP bypasses.

---

## 4. Sensitive Information Protection & Redaction

### Structured Log Redaction
Pino logger and `pino-http` middleware redact sensitive fields from log outputs:
- `req.headers.authorization`
- `req.headers.cookie`
- `req.headers['set-cookie']`
- `req.body.password`
- `req.body.accessToken`
- `req.body.refreshToken`
- `req.body.secret`
- `res.headers['set-cookie']`

### Zero Password Storage
- Passwords, credentials, and social auth secrets are handled exclusively by **Auth0**.
- The application database never stores passwords, hashes, salts, or raw auth tokens.

---

## 5. Security Audit Logging

Security-critical operations trigger structured, append-only audit log records in PostgreSQL:
- User status updates (`USER_STATUS_UPDATED`)
- Role assignments and revocations (`ROLE_ASSIGNED`, `ROLE_REVOKED`)
- Role creations, updates, and deletions (`ROLE_CREATED`, `ROLE_UPDATED`, `ROLE_DELETED`)
- Permission reassignments (`ROLE_PERMISSIONS_UPDATED`)
- Administrative user updates (`USER_UPDATED_BY_ADMIN`)

Audit log records capture actor user IDs, resource identifiers, IP addresses, correlation IDs, user agents, and structured metadata. Audit logs are accessible only to authorized administrators holding `audit-logs:read`.

