export const REDIS_KEYS = {
  AUTH_USER_PREFIX: 'auth:user:',
  AUTH_ROLE_PREFIX: 'auth:role:',
  RATE_LIMIT_PREFIX: 'ratelimit:',
} as const;

export const REDIS_RECONNECT = {
  INITIAL_DELAY_MS: 50,
  MAX_DELAY_MS: 2000,
  FACTOR: 2,
} as const;

