import { asyncHandler } from '@/decorators/asyncHandler';
import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';
import { sanitizeUser } from '@/utils/sanitizeUser';
import { httpError } from '@/helpers/httpError';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { userServices } from '@/services/user.service';

const getUserById = async (
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
  const fullUserData = await userServices.findFullUserById(userId);

  if (!fullUserData) {
    return next(
      httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND)
    );
  }

  const sanitizedUser = sanitizeUser(fullUserData);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_PROFILE_RETRIEVED,
    data: { user: sanitizedUser },
  });
};

const getPublicProfileById = async (
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
  const fullUserData = await userServices.findPublicProfileById(userId);

  if (!fullUserData) {
    return next(
      httpError(404, 'User not found', ErrorCode.USER_NOT_FOUND)
    );
  }

  const sanitizedUser = sanitizeUser(fullUserData);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_PROFILE_RETRIEVED,
    data: { user: sanitizedUser },
  });
}

const updateProfile = async (
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

  await userServices.updateUserProfile(userId, req.body);

  const fullUserData = await userServices.findFullUserById(userId);
  const sanitizedUser = sanitizeUser(fullUserData);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_PROFILE_UPDATED,
    data: { user: sanitizedUser },
  });
};

const updateUserSettings = async (
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

  await userServices.updateUserSettings(userId, req.body);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_SETTINGS_UPDATED,
    data: { settings: userServices },
  });
};

const deleteUser = async (
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

  await userServices.deleteUser(userId);

  logger.info('User deleted', { userId });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_DELETED,
  });
};

const getUsersName = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const nameQuery = req.body.name;

  if (!nameQuery) {
    return next(
      httpError(400, 'Name query is required', ErrorCode.VALIDATION_ERROR)
    );
  }

  const usersRaw = await userServices.findUsersByName(nameQuery);

  if (usersRaw.length === 0) {
    return res.status(200).json({
      status: 'success',
      code: SuccessCode.USER_DATA_RETRIEVED, 
      message: 'No users found with this name',
      data: { users: [] }, 
    });
  }

  const users = usersRaw.map(user => ({
    id: user.id,
    name: user.name,
    avatar: user.profile?.avatar || null,
  }));

  res.status(200).json({
    status: 'success',
    code: SuccessCode.USER_DATA_RETRIEVED,
    message: 'Users retrieved successfully',
    data: { users },
  });
}

export const controllers = {
  getUserById: asyncHandler(getUserById),
  getPublicProfileById: asyncHandler(getPublicProfileById),
  updateProfile: asyncHandler(updateProfile),
  deleteUser: asyncHandler(deleteUser),
  updateUserSettings: asyncHandler(updateUserSettings),
  getUsersName: asyncHandler(getUsersName),
};
