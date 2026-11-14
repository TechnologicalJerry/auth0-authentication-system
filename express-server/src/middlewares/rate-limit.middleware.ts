import type { Request, Response, NextFunction } from 'express';
import { redisService } from '../infrastructure/redis/redis.service.js';
import { REDIS_KEYS } from '../infrastructure/redis/redis.constants.js';
import { appConfig } from '../config/app.config.js';
import { sendError } from '../common/utils/response.util.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { logger } from '../services/logger.service.js';

export interface RateLimiterOptions {
  name: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Creates an Express rate-limiting middleware backed by Redis.
 * Sets standard IETF rate-limit headers.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const { name, windowMs, maxRequests, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine client identifier (IP address from proxy-aware req.ip)
    const clientIdentifier = keyGenerator ? keyGenerator(req) : req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${REDIS_KEYS.RATE_LIMIT_PREFIX}${name}:${clientIdentifier}`;

    const result = await redisService.consumeRateLimit(rateLimitKey, maxRequests, windowMs);

    // Set standard rate limit headers
    res.setHeader('RateLimit-Limit', result.limit.toString());
    res.setHeader('RateLimit-Remaining', result.remaining.toString());
    res.setHeader('RateLimit-Reset', Math.ceil(result.resetTimeMs / 1000).toString());

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfterSeconds.toString());
      logger.warn(
        {
          limiter: name,
          ip: clientIdentifier,
          path: req.originalUrl,
          retryAfter: result.retryAfterSeconds,
        },
        'Rate limit exceeded',
      );

      sendError(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        'Too many requests. Please try again later.',
        ErrorCode.RATE_LIMIT_EXCEEDED,
        { retryAfterSeconds: result.retryAfterSeconds },
      );
      return;
    }

    next();
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
 * Auth rate limiter: protects authentication endpoints against brute force.
 */
export const authRateLimiter = createRateLimiter({
  name: 'auth',
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.authMaxRequests,
});

/**
 * Admin rate limiter: protects high-privilege administrative queries.
 */
export const adminRateLimiter = createRateLimiter({
  name: 'admin',
  windowMs: appConfig.rateLimit.windowMs,
  maxRequests: appConfig.rateLimit.adminMaxRequests,
});

