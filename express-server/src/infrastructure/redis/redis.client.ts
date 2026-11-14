import { Redis, type RedisOptions } from 'ioredis';
import { appConfig } from '../../config/app.config.js';
import { logger } from '../../services/logger.service.js';
import { REDIS_RECONNECT } from './redis.constants.js';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const { redis: redisConf } = appConfig;

  const retryStrategy = (times: number): number | null => {
    if (times > redisConf.maxRetries) {
      logger.error(
        { attempts: times, maxRetries: redisConf.maxRetries },
        'Redis max reconnection attempts exceeded',
      );
      return null; // Stop retrying
    }

    const delay = Math.min(
      REDIS_RECONNECT.INITIAL_DELAY_MS * Math.pow(REDIS_RECONNECT.FACTOR, times),
      REDIS_RECONNECT.MAX_DELAY_MS,
    );

    logger.warn({ attempt: times, nextRetryDelayMs: delay }, 'Reconnecting to Redis...');
    return delay;
  };

  const options: RedisOptions = {
    connectTimeout: redisConf.connectTimeout,
    retryStrategy,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    keyPrefix: redisConf.keyPrefix,
    lazyConnect: true,
  };

  if (redisConf.tlsEnabled) {
    options.tls = {};
  }

  if (redisConf.username) {
    options.username = redisConf.username;
  }

  if (redisConf.password) {
    options.password = redisConf.password;
  }

  if (redisConf.url) {
    redisInstance = new Redis(redisConf.url, options);
  } else {
    options.host = redisConf.host;
    options.port = redisConf.port;
    redisInstance = new Redis(options);
  }

  redisInstance.on('connect', () => {
    logger.info('Redis connection established');
  });

  redisInstance.on('ready', () => {
    logger.info('Redis client ready to accept commands');
  });

  redisInstance.on('error', (err: Error) => {
    logger.error({ err }, 'Redis client connection error');
  });

  redisInstance.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisInstance.on('reconnecting', (delay: number) => {
    logger.info({ delay }, 'Redis client reconnecting');
  });

  return redisInstance;
}

