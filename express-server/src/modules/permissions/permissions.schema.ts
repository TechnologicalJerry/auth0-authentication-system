import { z } from 'zod/v4';

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.uuid('Invalid permission ID')),
});

export const roleIdParamSchema = z.object({
  id: z.uuid('Invalid role ID'),
});

