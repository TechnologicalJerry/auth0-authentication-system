import { z } from 'zod';

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid('Invalid permission ID')),
});

export const roleIdParamSchema = z.object({
  id: z.string().uuid('Invalid role ID'),
});
