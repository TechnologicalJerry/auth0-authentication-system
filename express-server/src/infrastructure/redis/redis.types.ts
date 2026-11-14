export interface RedisConfig {
  url?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  tlsEnabled: boolean;
  connectTimeout: number;
  maxRetries: number;
  keyPrefix: string;
}

export interface CacheSetOptions {
  ttlSeconds?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds: number;
}

