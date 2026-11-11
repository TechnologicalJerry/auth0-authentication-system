import { Router } from 'express';
import { permissionsController } from './permissions.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorizePermission } from '../../middlewares/authorize-permission.middleware.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

const permissionsRouter = Router();

permissionsRouter.get('/', authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_READ), (req, res) =>
  permissionsController.getPermissions(req, res),
);

export { permissionsRouter };

