import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './openapi.spec.js';

const swaggerRouter = Router();

// Raw OpenAPI JSON specification
swaggerRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

// Interactive Swagger UI documentation
swaggerRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  customSiteTitle: 'Auth0 Authentication System API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

export { swaggerRouter };

