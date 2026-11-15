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
