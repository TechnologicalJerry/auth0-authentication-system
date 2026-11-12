# Auth0 Integration Guide

This document covers the Auth0 integration architecture for the `auth0-authentication-system` Express server.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Auth0 Tenant Setup](#auth0-tenant-setup)
- [API Registration](#api-registration)
- [Token Validation Architecture](#token-validation-architecture)
- [Environment Configuration](#environment-configuration)
- [Authentication Flow](#authentication-flow)
- [Frontend Integration](#frontend-integration)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)

---

## Prerequisites

Before integrating with Auth0, you need:

1. An **Auth0 account** and tenant (free tier works for development)
2. An **Auth0 API** registered for this application
3. One or more **Auth0 Applications** for your frontend clients (Angular, Next.js, Vue)
4. **PostgreSQL 18** running and accessible
5. **Node.js 26.x** LTS installed

---

## Auth0 Tenant Setup

### 1. Create an Auth0 Tenant

1. Sign up at [auth0.com](https://auth0.com)
2. Create a new tenant (e.g., `your-project-name`)
3. Note your **Auth0 Domain**: `your-tenant.auth0.com`

### 2. Configure Signing Algorithm

- Navigate to **Tenant Settings → Advanced → Signing Algorithm**
- Ensure **RS256** is selected (default)
- RS256 uses asymmetric keys — the Express API verifies tokens using the public key from JWKS without needing the private key

### 3. JWKS Endpoint

Auth0 automatically exposes a JWKS endpoint:

```
https://your-tenant.auth0.com/.well-known/jwks.json
```

This endpoint provides the public keys used to verify JWT signatures. The Express server fetches and caches these keys automatically.

---

## API Registration

### 1. Create an Auth0 API

1. Navigate to **Applications → APIs → Create API**
2. Configure:
   - **Name**: `Auth0 Authentication System API`
   - **Identifier (Audience)**: `https://your-api-identifier` (use a URI; this does not need to be a real URL)
   - **Signing Algorithm**: RS256

### 2. Enable RBAC (Optional, for Phase 3)

1. In your API settings, go to the **RBAC** tab
2. Enable **RBAC** and **Add Permissions in the Access Token**
3. Define permissions (e.g., `read:users`, `write:users`)

### 3. Configure Token Settings

- **Token Expiration**: Set appropriate lifetime (e.g., 86400 seconds / 24 hours)
- **Token Dialect**: Ensure the access token includes the `sub` claim

---

## Token Validation Architecture

The Express server validates Auth0 access tokens using the **`jose`** library:

```
Client Request
    │
    ▼
Authorization: Bearer <access_token>
    │
    ▼
┌─────────────────────────────┐
│  Extract Bearer Token       │
│  from Authorization header  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  jose.jwtVerify()           │
│                             │
│  ● Fetch JWKS public keys   │
│    (cached, auto-refresh)   │
│  ● Verify RS256 signature   │
│  ● Validate issuer (iss)    │
│  ● Validate audience (aud)  │
│  ● Check expiration (exp)   │
│  ● Check not-before (nbf)   │
│  ● Apply clock tolerance    │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Map Verified Claims        │
│                             │
│  ● Extract sub              │
│  ● Extract scopes           │
│  ● Extract permissions      │
│  ● Extract custom roles     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Attach to req.auth         │
│  (AuthenticatedUser)        │
└──────────┬──────────────────┘
           │
           ▼
    Route Handler
```

### What Is Validated

| Check | Detail |
|-------|--------|
| **Signature** | RS256 asymmetric signature verified against Auth0 JWKS |
| **Algorithm** | Only explicitly allowed algorithms accepted (prevents confusion attacks) |
| **Issuer** | Must match `https://{AUTH0_DOMAIN}/` |
| **Audience** | Must match the registered API identifier |
| **Expiration** | Token must not be expired (with configurable clock tolerance) |
| **Not-before** | Token must be active when `nbf` claim is present |
| **Subject** | The `sub` claim must be present |

### What Is NOT Accepted

- Tokens signed with `none` algorithm
- Tokens with mismatched issuer or audience
- ID tokens (these are for the frontend, not the API)
- Self-signed or manually constructed JWTs
- Tokens from untrusted JWKS endpoints

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH0_DOMAIN` | Auth0 tenant domain | `your-tenant.auth0.com` |
| `AUTH0_AUDIENCE` | API identifier registered in Auth0 | `https://your-api-identifier` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH0_ISSUER_BASE_URL` | `https://{AUTH0_DOMAIN}/` | Full issuer URL |
| `AUTH0_JWKS_URI` | `https://{AUTH0_DOMAIN}/.well-known/jwks.json` | JWKS endpoint |
| `AUTH0_ALGORITHMS` | `RS256` | Comma-separated allowed signing algorithms |
| `AUTH0_CLOCK_TOLERANCE` | `5` | Clock skew tolerance in seconds |
| `AUTH0_TOKEN_MAX_AGE` | *(none)* | Maximum accepted token age in seconds |
| `AUTH0_CLIENT_ID` | *(none)* | Application client ID (for Management API, Phase 3) |
| `AUTH0_CLIENT_SECRET` | *(none)* | Application client secret (for Management API, Phase 3) |
| `AUTH0_ROLES_CLAIM_NAMESPACE` | *(none)* | Custom claim namespace for roles (e.g., `https://your-app.example.com/roles`) |

### Example `.env`

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier
AUTH0_ALGORITHMS=RS256
AUTH0_CLOCK_TOLERANCE=5
```

> **Security**: Never commit `.env` files to version control. Never expose `AUTH0_CLIENT_SECRET` to frontend applications.

---

## Authentication Flow

### How Frontend Clients Authenticate

```
┌──────────────────┐
│  Angular Client  │──┐
│  Next.js Client  │──┼── Auth0 Universal Login ── Auth0 Tenant
│  Vue Client      │──┘        │
                               │
                        Access Token (JWT)
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Express API       │
                    │                      │
                    │  Bearer Token ──►    │
                    │  JWT Verification    │
                    │  ──► Protected       │
                    │      Resources      │
                    └──────────────────────┘
```

1. The frontend redirects users to **Auth0 Universal Login**
2. Auth0 authenticates the user and issues tokens
3. The frontend receives an **access token** (JWT) intended for this API
4. The frontend includes the access token in API requests: `Authorization: Bearer <token>`
5. The Express API verifies the token using Auth0's JWKS public keys
6. If valid, the authenticated user identity is attached to the request

### Important: Access Tokens vs ID Tokens

| Token Type | Purpose | Used By |
|-----------|---------|---------|
| **Access Token** | Authorize API requests | Express API |
| **ID Token** | Authenticate the user in the frontend | Frontend only |

> **Do NOT send ID tokens to the API.** Access tokens contain the `aud` claim matching your API identifier and are designed for API authorization. ID tokens are for the frontend application.

### Frontend SDK Configuration

When configuring your frontend Auth0 SDK, set the **audience** to match `AUTH0_AUDIENCE`:

**Angular** (using `@auth0/auth0-angular`):
```typescript
AuthModule.forRoot({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-frontend-client-id',
  authorizationParams: {
    audience: 'https://your-api-identifier',
  },
  httpInterceptor: {
    allowedList: ['https://your-api-domain/api/*'],
  },
});
```

**React/Next.js** (using `@auth0/auth0-react` or `@auth0/nextjs-auth0`):
```typescript
<Auth0Provider
  domain="your-tenant.auth0.com"
  clientId="your-frontend-client-id"
  authorizationParams={{
    audience: 'https://your-api-identifier',
  }}
>
```

**Vue** (using `@auth0/auth0-vue`):
```typescript
createAuth0({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-frontend-client-id',
  authorizationParams: {
    audience: 'https://your-api-identifier',
  },
});
```

---

## API Endpoints

### GET /api/v1/auth/me

Returns the verified authenticated user's identity.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Authenticated user retrieved successfully",
  "data": {
    "sub": "auth0|64abc123def456",
    "issuer": "https://your-tenant.auth0.com/",
    "scopes": ["openid", "profile", "email"],
    "permissions": ["read:users"],
    "roles": ["admin"]
  },
  "timestamp": "2026-11-10T12:00:00.000Z"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Authorization header is required",
  "error": {
    "code": "AUTHENTICATION_REQUIRED"
  },
  "timestamp": "2026-11-10T12:00:00.000Z"
}
```

### GET /api/v1/auth/status

Returns the Auth0 integration configuration status. This endpoint is public.

**Success Response (200):**
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
  "timestamp": "2026-11-10T12:00:00.000Z"
}
```

---

## Error Handling

All authentication errors follow the standard API error response format:

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | No Authorization header provided |
| `INVALID_AUTHORIZATION_HEADER` | 401 | Header missing, malformed, or not using Bearer scheme |
| `INVALID_TOKEN` | 401 | Token is structurally invalid or signature verification failed |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `TOKEN_NOT_ACTIVE` | 401 | Token's `nbf` claim indicates it is not yet valid |
| `INVALID_TOKEN_ISSUER` | 401 | Token was issued by an untrusted issuer |
| `INVALID_TOKEN_AUDIENCE` | 401 | Token was not intended for this API |
| `UNSUPPORTED_TOKEN_ALGORITHM` | 401 | Token uses a disallowed signing algorithm |
| `AUTHENTICATION_SERVICE_UNAVAILABLE` | 503 | Cannot reach Auth0 JWKS endpoint |

> **Security**: Error messages never reveal cryptographic implementation details, raw JWT verification errors, or internal stack traces in production.

---

## Security Considerations

### Token Handling

- **Never log access tokens.** Authorization headers are redacted in structured logs.
- **Never return tokens in API responses.** The `/me` endpoint returns identity claims, not the token itself.
- **Never store access tokens on the server.** Tokens are verified per-request using JWKS.
- **Never accept tokens in query parameters.** Only the Authorization header is supported.

### JWKS Security

- Public keys are fetched from Auth0's JWKS endpoint over HTTPS only.
- Keys are cached to reduce latency and network calls.
- Cache is refreshed automatically to handle key rotation.
- A cooldown period prevents excessive JWKS refetching.
- Network timeouts are bounded to prevent hanging requests.

### Algorithm Security

- Only explicitly configured algorithms are accepted (default: RS256).
- The `none` algorithm is never accepted.
- Algorithm confusion attacks are prevented by validating the signing algorithm before verifying the signature.

### Claim Validation

- Issuer and audience are strictly validated.
- Expired tokens are rejected.
- Clock tolerance is configurable but defaults to 5 seconds.
- The `sub` claim is required on all access tokens.

### Secret Management

- `AUTH0_CLIENT_SECRET` is never exposed to frontend applications.
- All Auth0 credentials are loaded from environment variables, never hardcoded.
- The `.env` file is excluded from version control via `.gitignore`.
- Client secret is only needed for server-side Management API operations (Phase 3+).

### Frontend Security

- Frontend applications must use Auth0 Universal Login (redirect-based flow).
- Frontend SDKs should request access tokens with the correct audience for this API.
- ID tokens must not be sent to the API as bearer tokens.
- CORS configuration should be implemented to restrict origins (Phase 4).
