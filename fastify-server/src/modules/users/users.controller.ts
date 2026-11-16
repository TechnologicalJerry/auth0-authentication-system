import type { FastifyRequest, FastifyReply } from 'fastify';
import { usersService } from './users.service.js';
import {
  updateUserProfileSchema,
  adminUpdateUserSchema,
  updateUserStatusSchema,
  userQuerySchema,
  userIdParamSchema,
} from './users.schema.js';
import { sendSuccess } from '../../common/utils/response.util.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/utils/app-error.util.js';
import { ErrorCode } from '../../common/enums/error-code.enum.js';

export class UsersController {
  async getMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.currentUser) {
      throw new AppError(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const profile = await usersService.getProfileByAuth0Id(request.currentUser.auth0UserId);
    sendSuccess(reply, HTTP_STATUS.OK, 'Profile retrieved successfully', profile);
  }

  async updateMe(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!request.currentUser) {
      throw new AppError(
        'Authentication required',
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.AUTHENTICATION_REQUIRED,
      );
    }

    const parseResult = updateUserProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw new AppError(
        'Invalid request payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        parseResult.error.issues,
      );
    }

    const updated = await usersService.updateProfileByAuth0Id(
      request.currentUser.auth0UserId,
      parseResult.data,
    );
    sendSuccess(reply, HTTP_STATUS.OK, 'Profile updated successfully', updated);
  }

  async getUsers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parseResult = userQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw new AppError(
        'Invalid query parameters',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        parseResult.error.issues,
      );
    }

    const users = await usersService.getUsers(parseResult.data);
    sendSuccess(reply, HTTP_STATUS.OK, 'Users retrieved successfully', users.items, users.pagination);
  }

  async getUserById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const user = await usersService.getUserById(paramResult.data.id);
    sendSuccess(reply, HTTP_STATUS.OK, 'User retrieved successfully', user);
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = adminUpdateUserSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new AppError(
        'Invalid request payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        bodyResult.error.issues,
      );
    }

    const updated = await usersService.updateUser(paramResult.data.id, bodyResult.data);
    sendSuccess(reply, HTTP_STATUS.OK, 'User updated successfully', updated);
  }

  async updateUserStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = updateUserStatusSchema.safeParse(request.body);
    if (!bodyResult.success) {
      throw new AppError(
        'Invalid status payload',
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.VALIDATION_ERROR,
        bodyResult.error.issues,
      );
    }

    const updated = await usersService.updateUserStatus(paramResult.data.id, bodyResult.data);
    sendSuccess(reply, HTTP_STATUS.OK, 'User status updated successfully', updated);
  }
}

export const usersController = new UsersController();
