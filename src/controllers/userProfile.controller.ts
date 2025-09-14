import { asyncHandler } from '@/decorators/asyncHandler';
import { Request, Response } from 'express';
import logger from '@/utils/logger';
import {
  deleteUserService,
  updateUserProfileService,
  updateUserSettingsService,
} from '@/services/user.service';
import { setCache } from '@/utils/cache';
import { findUserByIdService } from '@/services/auth.service';
import { sanitizeUser } from '@/utils/sanitizeUser';



//get
const getUserByIdController = async (req: Request, res: Response) => {
  const idParam = req.params.id;
  const userId = Number(idParam);

  if (!idParam || Number.isNaN(userId)) {
    logger.warn('Invalid user id param for GET /profile/:id', {
      idParam,
      requesterId: req.user?.id,
    });
    return res.status(400).json({
      status: 'error',
      message: 'Invalid user id',
    });
  }

  const requesterId = req.user?.id ? Number(req.user.id) : undefined;

  logger.info('Fetching user by id', {
    requesterId,
    requestedUserId: userId,
    route: 'GET /profile/:id',
  });

  const fullUserData = await findUserByIdService(userId);

  if (!fullUserData) {
    logger.warn('User not found', { requestedUserId: userId, requesterId });
    return res.status(404).json({
      status: 'error',
      message: 'User not found',
    });
  }


  const sanitizedUser = sanitizeUser(fullUserData);
  if (sanitizedUser && requesterId !== userId) {
    delete (sanitizedUser as any).email;
    delete (sanitizedUser as any).phoneNumber;
  }

  const cacheKey = `user:${userId}`;
  await setCache(cacheKey, sanitizedUser, 600);

  logger.info('User profile returned', { requestedUserId: userId, requesterId });

  return res.status(200).json({
    status: 'success',
    user: sanitizedUser,
  });
};


//update
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
