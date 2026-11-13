import { envConfig } from './env.config.js';
import { databaseConfig } from './database.config.js';
import { loggerConfig } from './logger.config.js';

export const appConfig = {
  env: envConfig,
  database: databaseConfig,
  logger: loggerConfig,
  server: {
    port: envConfig.PORT,
    host: envConfig.HOST,
    apiPrefix: envConfig.API_PREFIX,
    appName: envConfig.APP_NAME,
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

