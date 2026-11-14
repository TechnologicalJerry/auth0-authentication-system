import { env } from './env.config.js';
import { createDatabaseConfig } from './database.config.js';
import { createLoggerConfig } from './logger.config.js';
import { createAuth0Config } from './auth0.config.js';
import { createRedisConfig } from '../infrastructure/redis/redis.config.js';
import type { DatabaseConfig } from './database.config.js';
import type { LoggerConfig } from './logger.config.js';
import type { Auth0Config } from './auth0.config.js';
import type { RedisConfig } from '../infrastructure/redis/redis.types.js';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  authMaxRequests: number;
  adminMaxRequests: number;
}

export interface SecurityConfig {
  allowedOrigins: string[];
  trustProxy: string;
}

export interface SwaggerConfig {
  enabled: boolean;
}

export interface CacheConfig {
  authTtlSeconds: number;
}

export interface ShutdownConfig {
  timeoutMs: number;
}

export interface AppConfig {
  env: typeof env;
  database: DatabaseConfig;
  logger: LoggerConfig;
  auth0: Auth0Config;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  swagger: SwaggerConfig;
  cache: CacheConfig;
  shutdown: ShutdownConfig;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export const appConfig: AppConfig = {
  env,
  database: createDatabaseConfig(env),
  logger: createLoggerConfig(env),
  auth0: createAuth0Config(env),
  redis: createRedisConfig(env),
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    authMaxRequests: env.RATE_LIMIT_AUTH_MAX_REQUESTS,
    adminMaxRequests: env.RATE_LIMIT_ADMIN_MAX_REQUESTS,
  },
  security: {
    allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    trustProxy: env.TRUST_PROXY,
  },
  swagger: {
    enabled: env.SWAGGER_ENABLED,
  },
  cache: {
    authTtlSeconds: env.AUTH_CACHE_TTL_SECONDS,
  },
  shutdown: {
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
  },
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
};
