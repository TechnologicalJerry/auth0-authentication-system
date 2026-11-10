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
