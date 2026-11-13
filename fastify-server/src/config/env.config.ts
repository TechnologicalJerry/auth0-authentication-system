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
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: z
    .string({
      required_error: 'DATABASE_URL is required',
    })
    .url({ message: 'DATABASE_URL must be a valid database connection URL' }),

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

