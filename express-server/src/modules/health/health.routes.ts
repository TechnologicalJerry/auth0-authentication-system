import { Router } from 'express';
import { healthController } from './health.controller.js';

const healthRouter = Router();

healthRouter.get('/', (req, res) => healthController.getHealth(req, res));
healthRouter.get('/live', (req, res) => healthController.getLiveness(req, res));
healthRouter.get('/ready', (req, res) => healthController.getReadiness(req, res));
healthRouter.get('/dependencies', (req, res) => healthController.getDependencies(req, res));

export { healthRouter };
