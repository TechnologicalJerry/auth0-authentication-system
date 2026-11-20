import { Hono } from 'hono';
import { healthController } from './health.controller.js';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => healthController.getHealth(c));
healthRoutes.get('/live', (c) => healthController.getLiveness(c));
healthRoutes.get('/ready', (c) => healthController.getReadiness(c));
