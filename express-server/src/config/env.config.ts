import { z } from 'zod/v4';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('auth0-authentication-system-express'),
  APP_VERSION: z.string().default('1.0.0'),

  DATABASE_URL: z.url(),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Auth0
  AUTH0_DOMAIN: z.string().min(1),
  AUTH0_ISSUER_BASE_URL: z.url().optional(),
  AUTH0_AUDIENCE: z.string().min(1),
  AUTH0_CLIENT_ID: z.string().min(1).optional(),
  AUTH0_CLIENT_SECRET: z.string().min(1).optional(),
  AUTH0_ALGORITHMS: z.string().default('RS256'),
  AUTH0_JWKS_URI: z.url().optional(),
  AUTH0_CLOCK_TOLERANCE: z.coerce.number().int().nonnegative().default(5),
  AUTH0_TOKEN_MAX_AGE: z.coerce.number().int().positive().optional(),
  AUTH0_ROLES_CLAIM_NAMESPACE: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('false'),
  REDIS_CONNECT_TIMEOUT: z.coerce.number().int().positive().default(10000),
  REDIS_MAX_RETRIES: z.coerce.number().int().nonnegative().default(5),
  REDIS_KEY_PREFIX: z.string().default('auth0_app:'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_ADMIN_MAX_REQUESTS: z.coerce.number().int().positive().default(60),

  // Security & CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:4200,http://localhost:5173'),
  TRUST_PROXY: z.string().default('loopback, linklocal, uniquelocal'),

  // Swagger Documentation
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .default('true'),

  // Authorization Caching
  AUTH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // Server Lifecycle & Graceful Shutdown
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = z.prettifyError(result.error);
    console.error('❌ Invalid environment configuration:\n', formatted);
    process.exit(1);
  }

  return result.data;
}

export const env: EnvConfig = validateEnv();
