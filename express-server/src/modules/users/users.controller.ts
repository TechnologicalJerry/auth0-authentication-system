import type { Request, Response } from 'express';
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
  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED, ErrorCode.AUTHENTICATION_REQUIRED);
    }

    const profile = await usersService.getProfile(req.currentUser.id);
    sendSuccess(res, HTTP_STATUS.OK, 'Profile retrieved successfully', profile);
  }

  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.currentUser) {
      throw new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED, ErrorCode.AUTHENTICATION_REQUIRED);
    }

    const parseResult = updateUserProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: parseResult.error.format(),
      });
    }

    const updated = await usersService.updateProfile(req.currentUser.id, parseResult.data);
    sendSuccess(res, HTTP_STATUS.OK, 'Profile updated successfully', updated);
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    const parseResult = userQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new AppError('Invalid query parameters', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: parseResult.error.format(),
      });
    }

    const users = await usersService.getUsers(parseResult.data);
    sendSuccess(res, HTTP_STATUS.OK, 'Users retrieved successfully', users);
  }

  async getUserById(req: Request, res: Response): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const user = await usersService.getUserById(paramResult.data.id);
    sendSuccess(res, HTTP_STATUS.OK, 'User retrieved successfully', user);
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = adminUpdateUserSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid request payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const updated = await usersService.updateUserByAdmin(
      paramResult.data.id,
      bodyResult.data,
      req.currentUser?.id,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'User updated successfully', updated);
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    const paramResult = userIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      throw new AppError('Invalid user ID', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR);
    }

    const bodyResult = updateUserStatusSchema.safeParse(req.body);
    if (!bodyResult.success) {
      throw new AppError('Invalid status payload', HTTP_STATUS.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, {
        details: bodyResult.error.format(),
      });
    }

    const updated = await usersService.updateUserStatus(
      paramResult.data.id,
      bodyResult.data,
      req.currentUser?.id,
    );
    sendSuccess(res, HTTP_STATUS.OK, 'User status updated successfully', updated);
  }
}

export const usersController = new UsersController();
