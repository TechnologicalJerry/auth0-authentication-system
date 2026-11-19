import { envConfig } from './env.config.js';

export interface DatabaseConfig {
  url: string;
  minConnections: number;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
}

export const databaseConfig: DatabaseConfig = {
  url: envConfig.DATABASE_URL,
  minConnections: envConfig.DATABASE_POOL_MIN,
  maxConnections: envConfig.DATABASE_POOL_MAX,
  connectionTimeoutMs: envConfig.DATABASE_CONNECTION_TIMEOUT_MS,
  idleTimeoutMs: envConfig.DATABASE_IDLE_TIMEOUT_MS,
};
