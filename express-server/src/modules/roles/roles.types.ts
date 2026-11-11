export interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleResponseDto {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: string[];
  userCount?: number;
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  permissionIds?: string[];
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface AssignUserRoleDto {
  roleId: string;
}

export interface UserRoleAssignmentResponseDto {
  userId: string;
  roleId: string;
  roleName: string;
  assignedAt: string;
}

