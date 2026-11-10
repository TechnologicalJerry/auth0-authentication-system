import { env } from './env.config.js';
import { createDatabaseConfig } from './database.config.js';
import { createLoggerConfig } from './logger.config.js';
import { createAuth0Config } from './auth0.config.js';
import type { DatabaseConfig } from './database.config.js';
import type { LoggerConfig } from './logger.config.js';
import type { Auth0Config } from './auth0.config.js';

export interface AppConfig {
  env: typeof env;
  database: DatabaseConfig;
  logger: LoggerConfig;
  auth0: Auth0Config;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
}

export const appConfig: AppConfig = {
  env,
  database: createDatabaseConfig(env),
  logger: createLoggerConfig(env),
  auth0: createAuth0Config(env),
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
};
