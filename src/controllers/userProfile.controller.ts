import { asyncHandler } from '@/decorators/asyncHandler';
import { Request, Response } from 'express';
import logger from '@/utils/logger';
import {
  deleteUserService,
  updateUserProfileService,
  updateUserSettingsService,
} from '@/services/user.service';
import { setCache, getCache } from '@/utils/cache';
import { findUserByIdService } from '@/services/auth.service';
import { sanitizeUser } from '@/utils/sanitizeUser';

const getUserByIdController = async (req: Request, res: Response) => {
  const userId = req.params.id;

  if (!userId) {
    logger.warn('Invalid user id param for GET /profile/:id', { userId });
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid user id' });
  }

  const cacheUserKey = `user:${userId}`;

  const cachedUser = await getCache(cacheUserKey);
  if (cachedUser) {
    logger.info('User returned from cache', { requestedUserId: userId });
    return res.status(200).json({ status: 'success', user: cachedUser });
  }

  const fullUserData = await findUserByIdService(userId);

  if (!fullUserData) {
    logger.warn('User not found', { requestedUserId: userId });
    return res.status(404).json({ status: 'error', message: 'User not found' });
  }

  const sanitizedUser = sanitizeUser(fullUserData);

  await setCache(cacheUserKey, sanitizedUser, 600);
  logger.info('User cached', { requestedUserId: userId });

  logger.info('User profile returned from DB', { requestedUserId: userId });

  return res.status(200).json({ status: 'success', user: sanitizedUser });
};

const updateProfileController = async (req: Request, res: Response) => {
  if (!req.user) {
    logger.warn('Unauthorized access attempt to update profile');
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
    });
  }
  const userId = req.user.id;

  await updateUserProfileService(userId, req.body);

  logger.info('User profile updated', { userId });

  const fullUserData = await findUserByIdService(userId);
  const sanitizedUser = sanitizeUser(fullUserData);

  const cacheKey = 'user' + userId;
  await setCache(cacheKey, sanitizedUser, 600);

  return res.json({
    status: 'success',
    message: 'Profile updated successfully',
    user: sanitizedUser,
  });
};

export const updateUserSettingsController = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    logger.warn('Unauthorized access attempt to update profile');
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized',
    });
  }
  const userId = req.user.id;

  await updateUserSettingsService(userId, req.body);

  logger.info('User settings updated', { userId });

  const fullUserData = await findUserByIdService(userId);
  const sanitizedUser = sanitizeUser(fullUserData);

  const cacheKey = 'user' + userId;
  await setCache(cacheKey, sanitizedUser, 600);

  res.status(200).json({
    status: 'success',
    message: 'User settings update',
    settings: sanitizedUser,
  });
};

export const deleteUserController = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
    });
  }

  await deleteUserService(userId);

  logger.info('User deleted', { userId });

  return res.status(200).json({
    status: 'success',
    message: 'User and all related data deleted successfully',
  });
};

export const controllers = {
  getUserByIdController: asyncHandler(getUserByIdController),
  updateProfileController: asyncHandler(updateProfileController),
  deleteUserController: asyncHandler(deleteUserController),
  updateUserSettingsController: asyncHandler(updateUserSettingsController),
};
