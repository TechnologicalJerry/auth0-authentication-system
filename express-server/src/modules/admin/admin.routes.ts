import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorizeRole } from '../../middlewares/authorize-role.middleware.js';
import { SYSTEM_ROLES } from '../../common/constants/roles.constants.js';

const adminRouter = Router();

adminRouter.get(
  '/dashboard',
  authenticate,
  authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN),
  (req, res) => adminController.getDashboard(req, res),
);

adminRouter.get(
  '/users/statistics',
  authenticate,
  authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN),
  (req, res) => adminController.getUserStatistics(req, res),
);

adminRouter.get(
  '/roles/statistics',
  authenticate,
  authorizeRole(SYSTEM_ROLES.SUPER_ADMIN, SYSTEM_ROLES.ADMIN),
  (req, res) => adminController.getRoleStatistics(req, res),
);

export { adminRouter };

