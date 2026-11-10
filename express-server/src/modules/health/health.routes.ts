import { Router } from 'express';
import { healthController } from './health.controller.js';

const healthRouter = Router();

healthRouter.get('/', (req, res) => healthController.getHealth(req, res));

export { healthRouter };
