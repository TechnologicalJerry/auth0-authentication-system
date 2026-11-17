import { envConfig } from './env.config.js';
import { databaseConfig } from './database.config.js';
import { loggerConfig } from './logger.config.js';
import { createAuth0Config } from './auth0.config.js';
import { createRedisConfig } from '../infrastructure/redis/redis.config.js';

export const appConfig = {
  env: envConfig,
  database: databaseConfig,
  logger: loggerConfig,
  auth0: createAuth0Config(envConfig),
  redis: createRedisConfig(envConfig),
  rateLimit: {
    windowMs: envConfig.RATE_LIMIT_WINDOW_MS,
    maxRequests: envConfig.RATE_LIMIT_MAX_REQUESTS,
    authMaxRequests: envConfig.RATE_LIMIT_AUTH_MAX_REQUESTS,
    adminMaxRequests: envConfig.RATE_LIMIT_ADMIN_MAX_REQUESTS,
  },
  cache: {
    authTtlSeconds: envConfig.AUTH_CACHE_TTL_SECONDS,
  },
  swagger: {
    enabled: envConfig.SWAGGER_ENABLED,
  },
  shutdown: {
    timeoutMs: envConfig.SHUTDOWN_TIMEOUT_MS,
  },
  server: {
    port: envConfig.PORT,
    host: envConfig.HOST,
    apiPrefix: envConfig.API_PREFIX,
    appName: envConfig.APP_NAME,
    appVersion: envConfig.APP_VERSION,
    isProduction: envConfig.NODE_ENV === 'production',
    isDevelopment: envConfig.NODE_ENV === 'development',
    isTest: envConfig.NODE_ENV === 'test',
  },
  security: {
    allowedOrigins: envConfig.ALLOWED_ORIGINS,
    trustProxy: envConfig.TRUST_PROXY,
  },
} as const;

export type AppConfig = typeof appConfig;
