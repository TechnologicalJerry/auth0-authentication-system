import type { AuthenticatedUser } from '../../integrations/auth0/auth0.types.js';
import { usersRepository } from './users.repository.js';
import { authCacheService } from '../../infrastructure/cache/auth-cache.service.js';
import { auditLogsService } from '../audit-logs/audit-logs.service.js';
import { prisma } from '../../database/prisma.client.js';
import { SYSTEM_ROLES } from '../../common/constants/roles.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';
import { logger } from '../../services/logger.service.js';
import type {
  CurrentUserContext,
  UserResponseDto,
  UpdateUserProfileDto,
  AdminUpdateUserDto,
  UpdateUserStatusDto,
  UserQueryFilter,
  PaginatedResult,
  ApplicationUserRecord,
} from './users.types.js';

export class UsersService {
  async syncAuth0User(auth0User: AuthenticatedUser): Promise<CurrentUserContext> {
    const claims = auth0User.claims;
    const email = (claims['email'] as string) || `${auth0User.sub}@placeholder.auth0.com`;
    const emailVerified = Boolean(claims['email_verified']);
    const firstName = (claims['given_name'] as string) || (claims['name'] as string)?.split(' ')[0] || null;
    const lastName = (claims['family_name'] as string) || null;
    const displayName = (claims['nickname'] as string) || (claims['name'] as string) || null;
    const profilePicture = (claims['picture'] as string) || null;

    let user = await usersRepository.findByAuth0UserId(auth0User.sub);

    if (!user) {
      logger.info({ auth0UserId: auth0User.sub, email }, 'Provisioning new application user from Auth0 identity');

      user = await usersRepository.upsertFromAuth0({
        auth0UserId: auth0User.sub,
        email,
        emailVerified,
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        displayName: displayName ?? undefined,
        profilePicture: profilePicture ?? undefined,
      });

      // Assign default USER role to new account if role exists
      const defaultRole = await prisma.role.findUnique({
        where: { name: SYSTEM_ROLES.USER },
      });

      if (defaultRole) {
        await prisma.userRole
          .create({
            data: {
              userId: user.id,
              roleId: defaultRole.id,
            },
          })
          .catch((err) => {
            logger.warn({ err }, 'Failed to assign default USER role on registration');
          });
      }

      await auditLogsService.log({
        actorUserId: user.id,
        action: 'USER_REGISTERED',
        resource: 'user',
        resourceId: user.id,
        status: 'SUCCESS',
        metadata: { email, auth0UserId: auth0User.sub },
      });
    } else {
      // Update last login timestamp
      await usersRepository.update(user.id, {
        lastLoginAt: new Date(),
        ...(emailVerified && !user.emailVerified ? { emailVerified: true } : {}),
      });
    }

    // Resolve context using Redis authorization cache
    const context = await authCacheService.getUserContext(auth0User.sub);

    if (!context) {
      throw new AppError('User profile could not be resolved', HTTP_STATUS.UNAUTHORIZED, ErrorCode.USER_NOT_FOUND);
    }

    if (!context.isActive) {
      logger.warn({ userId: context.id }, 'Access rejected: user account is deactivated');
      throw new AppError('Your account has been deactivated', HTTP_STATUS.FORBIDDEN, ErrorCode.USER_INACTIVE);
    }

    if (context.isBlocked) {
      logger.warn({ userId: context.id }, 'Access rejected: user account is blocked');
      throw new AppError('Your account has been suspended', HTTP_STATUS.FORBIDDEN, ErrorCode.USER_BLOCKED);
    }

    return context;
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const context = await authCacheService.getUserContext(user.auth0UserId);
    return this.mapToDto(user, context?.roles, context?.permissions);
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserResponseDto> {
    const existing = await usersRepository.findById(userId);
    if (!existing) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const updated = await usersRepository.update(userId, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName || null }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName || null }),
      ...(dto.displayName !== undefined && { displayName: dto.displayName || null }),
      ...(dto.profilePicture !== undefined && { profilePicture: dto.profilePicture || null }),
    });

    // Invalidate cached authorization context
    await authCacheService.invalidateUser(existing.auth0UserId);

    const context = await authCacheService.getUserContext(updated.auth0UserId);
    return this.mapToDto(updated, context?.roles, context?.permissions);
  }

  async getUsers(filter: UserQueryFilter): Promise<PaginatedResult<UserResponseDto>> {
    const result = await usersRepository.findMany(filter);
    return {
      items: result.items.map((item) => this.mapToDto(item, item.roles)),
      pagination: result.pagination,
    };
  }

  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const context = await authCacheService.getUserContext(user.auth0UserId);
    return this.mapToDto(user, context?.roles, context?.permissions);
  }

  async updateUserByAdmin(
    id: string,
    dto: AdminUpdateUserDto,
    actorUserId?: string,
  ): Promise<UserResponseDto> {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const updated = await usersRepository.update(id, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName || null }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName || null }),
      ...(dto.displayName !== undefined && { displayName: dto.displayName || null }),
      ...(dto.profilePicture !== undefined && { profilePicture: dto.profilePicture || null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.isBlocked !== undefined && { isBlocked: dto.isBlocked }),
    });

    // Invalidate cached authorization context
    await authCacheService.invalidateUser(user.auth0UserId);

    await auditLogsService.log({
      actorUserId,
      action: 'USER_UPDATED_BY_ADMIN',
      resource: 'user',
      resourceId: id,
      status: 'SUCCESS',
      metadata: { updates: dto },
    });

    const context = await authCacheService.getUserContext(updated.auth0UserId);
    return this.mapToDto(updated, context?.roles, context?.permissions);
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actorUserId?: string,
  ): Promise<UserResponseDto> {
    const user = await usersRepository.findById(id);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ErrorCode.USER_NOT_FOUND);
    }

    const updated = await usersRepository.update(id, {
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.isBlocked !== undefined && { isBlocked: dto.isBlocked }),
    });

    // Invalidate cached authorization context
    await authCacheService.invalidateUser(user.auth0UserId);

    await auditLogsService.log({
      actorUserId,
      action: 'USER_STATUS_UPDATED',
      resource: 'user',
      resourceId: id,
      status: 'SUCCESS',
      metadata: { isActive: dto.isActive, isBlocked: dto.isBlocked },
    });

    const context = await authCacheService.getUserContext(updated.auth0UserId);
    return this.mapToDto(updated, context?.roles, context?.permissions);
  }

  private mapToDto(
    user: ApplicationUserRecord,
    roles: string[] = [],
    permissions?: string[],
  ): UserResponseDto {
    return {
      id: user.id,
      auth0UserId: user.auth0UserId,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      profilePicture: user.profilePicture,
      isActive: user.isActive,
      isBlocked: user.isBlocked,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      roles,
      ...(permissions && { permissions }),
    };
  }
}

export const usersService = new UsersService();
