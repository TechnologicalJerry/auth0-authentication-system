/** Header name for Bearer token authorization */
export const AUTHORIZATION_HEADER = 'authorization' as const;

/** Bearer scheme prefix */
export const BEARER_PREFIX = 'Bearer ' as const;

/** Default JWKS cache max age in milliseconds (10 minutes) */
export const JWKS_CACHE_MAX_AGE_MS = 600_000;

/** Cooldown between JWKS refetch attempts in milliseconds (30 seconds) */
export const JWKS_COOLDOWN_MS = 30_000;

/** Timeout for JWKS endpoint requests in milliseconds (5 seconds) */
export const JWKS_TIMEOUT_MS = 5_000;
