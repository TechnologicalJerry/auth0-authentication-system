import { Router } from 'express';
import { rolesController } from './roles.controller.js';
import { permissionsController } from '../permissions/permissions.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorizePermission } from '../../middlewares/authorize-permission.middleware.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

const rolesRouter = Router();

// Role CRUD
rolesRouter.get('/', authenticate, authorizePermission(PERMISSIONS.ROLES_READ), (req, res) =>
  rolesController.getRoles(req, res),
);
rolesRouter.get('/:id', authenticate, authorizePermission(PERMISSIONS.ROLES_READ), (req, res) =>
  rolesController.getRoleById(req, res),
);
rolesRouter.post('/', authenticate, authorizePermission(PERMISSIONS.ROLES_CREATE), (req, res) =>
  rolesController.createRole(req, res),
);
rolesRouter.patch('/:id', authenticate, authorizePermission(PERMISSIONS.ROLES_UPDATE), (req, res) =>
  rolesController.updateRole(req, res),
);
rolesRouter.delete('/:id', authenticate, authorizePermission(PERMISSIONS.ROLES_DELETE), (req, res) =>
  rolesController.deleteRole(req, res),
);

// Role Permissions
rolesRouter.get('/:id/permissions', authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_READ), (req, res) =>
  permissionsController.getRolePermissions(req, res),
);
rolesRouter.put('/:id/permissions', authenticate, authorizePermission(PERMISSIONS.PERMISSIONS_MANAGE), (req, res) =>
  permissionsController.updateRolePermissions(req, res),
);

export { rolesRouter };
