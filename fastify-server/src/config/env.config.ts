import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('4000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val < 65536, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('fastify-server'),
  APP_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL is required',
    })
    .url({ message: 'DATABASE_URL must be a valid database connection URL' })
    .default('postgresql://auth_user:auth_secure_password_2026@localhost:5432/auth0_auth_db?schema=public'),

  // Auth0 Identity Provider Configuration
  AUTH0_DOMAIN: z.string().min(1).default('dev-tenant.auth0.com'),
  AUTH0_ISSUER_BASE_URL: z.string().url().optional(),
  AUTH0_AUDIENCE: z.string().min(1).default('https://api.auth0-system.com'),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
  AUTH0_ALGORITHMS: z.string().default('RS256'),
  AUTH0_JWKS_URI: z.string().url().optional(),
  AUTH0_CLOCK_TOLERANCE: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10)),
  AUTH0_TOKEN_MAX_AGE: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined)),
  AUTH0_ROLES_CLAIM_NAMESPACE: z
    .string()
    .default('https://api.auth0-system.com/roles'),

  // Redis 8 Configuration
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z
    .string()
    .default('6379')
    .transform((val) => parseInt(val, 10)),
  REDIS_USERNAME: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
  REDIS_CONNECT_TIMEOUT: z
    .string()
    .default('10000')
    .transform((val) => parseInt(val, 10)),
  REDIS_MAX_RETRIES: z
    .string()
    .default('5')
    .transform((val) => parseInt(val, 10)),
  REDIS_KEY_PREFIX: z.string().default('auth0_fastify:'),

  // Distributed Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('60000')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_AUTH_MAX_REQUESTS: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_ADMIN_MAX_REQUESTS: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10)),

  // Authorization Caching
  AUTH_CACHE_TTL_SECONDS: z
    .string()
    .default('300')
    .transform((val) => parseInt(val, 10)),

  // Swagger Documentation
  SWAGGER_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),

  // Graceful Shutdown
  SHUTDOWN_TIMEOUT_MS: z
    .string()
    .default('10000')
    .transform((val) => parseInt(val, 10)),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:4200,http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),

  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[fastify-server] Environment validation failure:\n${errorDetails}`,
    );
  }

  return result.data;
}

export const envConfig = validateEnv();
