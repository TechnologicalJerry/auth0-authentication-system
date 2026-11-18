# Security Architecture & Hardening — Fastify Server

This document outlines the security controls, HTTP hardening policies, CORS configuration, and threat mitigations implemented in `fastify-server`.

---

## 1. HTTP Security Headers via `@fastify/helmet`

Fastify registers `@fastify/helmet` with strict security defaults:
- **Content Security Policy (CSP)**: Restricts scripts and styles to self, preventing Cross-Site Scripting (XSS).
- **Cross-Origin Resource Policy (CORP)**: Configured as `cross-origin` to permit legitimate client access across distinct frontend domains.
- **Strict-Transport-Security (HSTS)**: Enforces TLS/HTTPS in production.
- **X-Content-Type-Options**: Prevents MIME-sniffing attacks.
- **X-Frame-Options**: Set to `SAMEORIGIN` to defeat clickjacking.

---

## 2. Cross-Origin Resource Sharing (CORS)

Cross-Origin Resource Sharing is controlled via `@fastify/cors`:
- **Strict Allowlist**: Only explicitly declared origins from `ALLOWED_ORIGINS` are permitted (`http://localhost:3000`, `http://localhost:4200`, `http://localhost:5173`).
- **Non-Browser Bypass**: Requests without an origin header (curl, mobile native clients, internal services) are permitted.
- **Exposed Headers**: `X-Request-ID`, `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`.
- **Max Age**: Preflight responses cached for `86400` seconds (24 hours).

---

## 3. Distributed Rate Limiting & DoS Defense

Standard IETF rate-limiting headers are emitted on every response:
- `RateLimit-Limit`: Maximum requests permitted within window.
- `RateLimit-Remaining`: Requests left in current window.
- `RateLimit-Reset`: Epoch timestamp when quota resets.
- `Retry-After`: Seconds to wait before retrying (on HTTP 429).

---

## 4. Reverse Proxy Trust Configuration

When running behind reverse proxies or load balancers (AWS ALB, Cloudflare, NGINX), `trustProxy` is set to `true` (or specific CIDR blocks) to ensure `request.ip` accurately reflects the originating client IP rather than the proxy IP.
