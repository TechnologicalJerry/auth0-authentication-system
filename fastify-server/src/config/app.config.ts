import { envConfig } from './env.config.js';
import { databaseConfig } from './database.config.js';
import { loggerConfig } from './logger.config.js';
import { createAuth0Config } from './auth0.config.js';

export const appConfig = {
  env: envConfig,
  database: databaseConfig,
  logger: loggerConfig,
  auth0: createAuth0Config(envConfig),
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
