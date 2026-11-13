import { envConfig } from './env.config.js';

export interface DatabaseConfig {
  url: string;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
}

export const databaseConfig: DatabaseConfig = {
  url: envConfig.DATABASE_URL,
  maxConnections: envConfig.NODE_ENV === 'production' ? 20 : 10,
  connectionTimeoutMs: 5000,
  idleTimeoutMs: 10000,
};

