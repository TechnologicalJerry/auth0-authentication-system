import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  APP_NAME: z.string().default('hono-server'),
  APP_VERSION: z.string().default('1.0.0'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DATABASE_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRETTY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  // Security
  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:4200,http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),
  TRUST_PROXY: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Invalid environment configuration:\n${errorDetails}\n`);
    throw new Error('Environment validation failed');
  }

  return result.data;
}

export const envConfig = validateEnv();
