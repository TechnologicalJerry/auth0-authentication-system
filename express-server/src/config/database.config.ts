import type { EnvConfig } from './env.config.js';

export interface DatabaseConfig {
  url: string;
}

export function createDatabaseConfig(env: EnvConfig): DatabaseConfig {
  return {
    url: env.DATABASE_URL,
  };
}
