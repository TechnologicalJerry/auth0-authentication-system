import { Router } from 'express';
import { auditLogsController } from './audit-logs.controller.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorizePermission } from '../../middlewares/authorize-permission.middleware.js';
import { PERMISSIONS } from '../../common/constants/permissions.constants.js';

const auditLogsRouter = Router();

auditLogsRouter.get('/', authenticate, authorizePermission(PERMISSIONS.AUDIT_LOGS_READ), (req, res) =>
  auditLogsController.getAuditLogs(req, res),
);

auditLogsRouter.get('/:id', authenticate, authorizePermission(PERMISSIONS.AUDIT_LOGS_READ), (req, res) =>
  auditLogsController.getAuditLogById(req, res),
);

export { auditLogsRouter };

