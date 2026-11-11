export interface ApplicationUserRecord {
  id: string;
  auth0UserId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profilePicture: string | null;
  isActive: boolean;
  isBlocked: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrentUserContext {
  id: string;
  auth0UserId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profilePicture: string | null;
  isActive: boolean;
  isBlocked: boolean;
  roles: string[];
  permissions: string[];
}

export interface UserResponseDto {
  id: string;
  auth0UserId: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profilePicture: string | null;
  isActive: boolean;
  isBlocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles?: string[];
  permissions?: string[];
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string;
}

export interface AdminUpdateUserDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string;
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface UpdateUserStatusDto {
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface UserQueryFilter {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  role?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

declare global {
  namespace Express {
    interface Request {
      currentUser?: CurrentUserContext;
    }
  }
}

