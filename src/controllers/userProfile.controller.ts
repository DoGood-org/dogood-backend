import { asyncHandler } from '@/decorators/asyncHandler';
import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import {
  deleteUserService,
  updateUserProfileService,
  updateUserSettingsService,
} from '@/services/user.service';
import { setCache, getCache } from '@/utils/cache';
import { findUserByIdService } from '@/services/auth.service';
import { sanitizeUser } from '@/utils/sanitizeUser';
import { httpError } from '@/helpers/httpError';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';


const getUserByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.params.id;

  if (!userId) {
    return next(
      httpError(400, 'Invalid user id', ErrorCode.VALIDATION_ERROR)
    );
  }

  const cacheKey = `user:${userId}`;
  const cachedUser = await getCache(cacheKey);

  if (cachedUser) {
    return res.status(200).json({
      status: 'success',
      code: SuccessCode.USER_PROFILE_RETRIEVED,
      data: { user: cachedUser },
    });
  }

  const fullUserData = await findUserByIdService(userId);

  if (!fullUserData) {
    return next(
      httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND)
    );
  }

  const sanitizedUser = sanitizeUser(fullUserData);
  await setCache(cacheKey, sanitizedUser, 600);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_PROFILE_RETRIEVED,
    data: { user: sanitizedUser },
  });
};


const updateProfileController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const userId = req.user.id;

  await updateUserProfileService(userId, req.body);

  const fullUserData = await findUserByIdService(userId);
  const sanitizedUser = sanitizeUser(fullUserData);

  await setCache(`user:${userId}`, sanitizedUser, 600);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_PROFILE_UPDATED,
    data: { user: sanitizedUser },
  });
};

const updateUserSettingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Unauthorized', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const userId = req.user.id;

  await updateUserSettingsService(userId, req.body);

  const fullUserData = await findUserByIdService(userId);
  const sanitizedUser = sanitizeUser(fullUserData);

  await setCache(`user:${userId}`, sanitizedUser, 600);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_SETTINGS_UPDATED,
    data: { settings: sanitizedUser },
  });
};

const deleteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  await deleteUserService(userId);

  logger.info('User deleted', { userId });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_DELETED,
  });
};

export const controllers = {
  getUserByIdController: asyncHandler(getUserByIdController),
  updateProfileController: asyncHandler(updateProfileController),
  deleteUserController: asyncHandler(deleteUserController),
  updateUserSettingsController: asyncHandler(updateUserSettingsController),
};
