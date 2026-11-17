import type { FastifyRequest, FastifyReply } from 'fastify';
import { redisService } from '../infrastructure/redis/redis.service.js';
import { REDIS_KEYS } from '../infrastructure/redis/redis.constants.js';
import { appConfig } from '../config/app.config.js';
import { AppError } from '../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { logger } from '../services/logger.service.js';

export interface RateLimiterOptions {
  name: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: FastifyRequest) => string;
}

/**
 * Creates a Fastify rate-limiting preHandler hook backed by Redis.
 * Sets standard IETF rate-limit headers.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { name, windowMs, maxRequests, keyGenerator } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Determine client identifier (IP address from proxy-aware request.ip)
    const clientIdentifier = keyGenerator ? keyGenerator(request) : request.ip || 'unknown';
    const rateLimitKey = `${REDIS_KEYS.RATE_LIMIT_PREFIX}${name}:${clientIdentifier}`;

    const result = await redisService.consumeRateLimit(rateLimitKey, maxRequests, windowMs);

    // Set standard rate limit headers
    reply.header('RateLimit-Limit', result.limit.toString());
    reply.header('RateLimit-Remaining', result.remaining.toString());
    reply.header('RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

    if (!result.allowed) {
      reply.header('Retry-After', result.retryAfterSeconds.toString());
      logger.warn(
        {
          limiter: name,
          ip: clientIdentifier,
          path: request.url,
          retryAfter: result.retryAfterSeconds,
        },
        'Rate limit exceeded',
      );

      throw new AppError(
        'Too many requests. Please try again later.',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { retryAfterSeconds: result.retryAfterSeconds },
      );
    }
  };
}

/**
 * Global rate limiter: applied to all general routes.
 */
export const globalRateLimiter = createRateLimiter({
  name: 'global',
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.maxRequests,
});

/**
 * Auth rate limiter: protects sensitive authentication routes against brute force.
 */
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.authMaxRequests,
});

/**
 * Admin rate limiter: protects resource-intensive administrative routes.
 */
export const adminRateLimiter = createRateLimiter({
  name: 'admin',
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.adminMaxRequests,
});
