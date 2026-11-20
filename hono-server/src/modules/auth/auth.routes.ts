import { Hono } from 'hono';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

export const authRoutes = new Hono();

/** Requires valid Auth0 access token */
authRoutes.get('/me', authenticate, (c) => authController.getMe(c));

/** Public - returns integration status */
authRoutes.get('/status', (c) => authController.getStatus(c));
