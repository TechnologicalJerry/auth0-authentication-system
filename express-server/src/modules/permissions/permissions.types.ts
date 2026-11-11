export interface PermissionRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermissionsResponseDto {
  roleId: string;
  roleName: string;
  permissions: PermissionResponseDto[];
}

export interface UpdateRolePermissionsDto {
  permissionIds: string[];
}

