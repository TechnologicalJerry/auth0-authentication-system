import { Router } from 'express';
import { usersController } from './users.controller.js';
import { rolesController } from '../roles/roles.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorizePermission } from '../../middlewares/authorize-permission.middleware.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

const usersRouter = Router();

// Current authenticated user profile endpoints
usersRouter.get('/me', authenticate, (req, res) => usersController.getMe(req, res));
usersRouter.patch('/me', authenticate, (req, res) => usersController.updateMe(req, res));

// User-Role assignment endpoints
usersRouter.post('/:id/roles', authenticate, authorizePermission(PERMISSIONS.ROLES_ASSIGN), (req, res) =>
  rolesController.assignRoleToUser(req, res),
);
usersRouter.delete(
  '/:id/roles/:roleId',
  authenticate,
  authorizePermission(PERMISSIONS.ROLES_ASSIGN),
  (req, res) => rolesController.revokeRoleFromUser(req, res),
);

// Administrative user management endpoints
usersRouter.get('/', authenticate, authorizePermission(PERMISSIONS.USERS_READ), (req, res) =>
  usersController.getUsers(req, res),
);
usersRouter.get('/:id', authenticate, authorizePermission(PERMISSIONS.USERS_READ), (req, res) =>
  usersController.getUserById(req, res),
);
usersRouter.patch('/:id', authenticate, authorizePermission(PERMISSIONS.USERS_UPDATE), (req, res) =>
  usersController.updateUser(req, res),
);
usersRouter.patch('/:id/status', authenticate, authorizePermission(PERMISSIONS.USERS_UPDATE), (req, res) =>
  usersController.updateUserStatus(req, res),
);

export { usersRouter };
