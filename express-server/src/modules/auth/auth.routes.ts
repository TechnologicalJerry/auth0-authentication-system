import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';

const authRouter = Router();

/** Requires valid Auth0 access token */
authRouter.get('/me', authenticate, (req, res) => authController.getMe(req, res));

/** Public - returns integration status */
authRouter.get('/status', (req, res) => authController.getStatus(req, res));

export { authRouter };
