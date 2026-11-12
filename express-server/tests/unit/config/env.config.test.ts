import { describe, it, expect } from 'vitest';
import { appConfig } from '../../../src/config/app.config.js';

describe('Environment Configuration Validation', () => {
  it('should load default environment configuration values', () => {
    expect(appConfig.env.PORT).toBeDefined();
    expect(typeof appConfig.env.PORT).toBe('number');
    expect(appConfig.env.API_PREFIX).toBe('/api/v1');
    expect(appConfig.env.APP_NAME).toBe('auth0-authentication-system-express');
  });

  it('should enforce required Auth0 domain and audience', () => {
    expect(appConfig.auth0.domain).toBeDefined();
    expect(appConfig.auth0.audience).toBeDefined();
    expect(appConfig.auth0.issuerBaseUrl).toContain('https://');
    expect(appConfig.auth0.jwksUri).toContain('/.well-known/jwks.json');
  });

  it('should parse Redis connection parameters correctly', () => {
    expect(appConfig.redis.host).toBeDefined();
    expect(appConfig.redis.port).toBe(6379);
    expect(appConfig.redis.keyPrefix).toBe('auth0_app:');
  });

  it('should define rate limit tiers for general, auth, and admin endpoints', () => {
    expect(appConfig.rateLimit.maxRequests).toBeGreaterThan(0);
    expect(appConfig.rateLimit.authMaxRequests).toBeLessThanOrEqual(appConfig.rateLimit.maxRequests);
    expect(appConfig.rateLimit.adminMaxRequests).toBeLessThanOrEqual(appConfig.rateLimit.maxRequests);
  });
});
