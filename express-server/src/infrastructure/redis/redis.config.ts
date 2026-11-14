import type { EnvConfig } from '../../config/env.config.js';
import type { RedisConfig } from './redis.types.js';

export function createRedisConfig(env: EnvConfig): RedisConfig {
  return {
    url: env.REDIS_URL,
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    username: env.REDIS_USERNAME,
    password: env.REDIS_PASSWORD,
    tlsEnabled: env.REDIS_TLS_ENABLED,
    connectTimeout: env.REDIS_CONNECT_TIMEOUT,
    maxRetries: env.REDIS_MAX_RETRIES,
    keyPrefix: env.REDIS_KEY_PREFIX,
  };
}

