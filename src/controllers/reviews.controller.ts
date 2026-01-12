import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import {
  checkReviewExistsService,
  createUserToOrganizationReviewService,
  createUserToPlatformReviewService,
  createUserToUserReviewService,
  deleteReviewsService,
  getReviewByIdService,
  getReviewsService,
  getUserReviewsService,
  updateReviewService,
} from '@/services/review.service';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { getTaskByIdService } from '@/services/task.service';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';


const createUserToUserReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('User attempted to review themselves', { authorUserId });
    return next(
      httpError(
        400,
        'You cannot leave a review for yourself',
        ErrorCode.REVIEW_SELF_FORBIDDEN
      )
    );
  }

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    logger.warn('Duplicate user review attempt', {
      authorUserId,
      targetUserId,
    });
    return next(
      httpError(
        409,
        'You have already left a review for this user',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await createUserToUserReviewService({
    authorUserId,
    targetUserId,
    rating,
    comment,
  });

  logger.info('User to user review created', {
    authorUserId,
    targetUserId,
  });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.REVIEW_CREATED,
    data: review,
  });
};

const createUserToOrganizationReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { targetOrganizationId, rating, comment } = req.body;

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'ORGANIZATION',
    targetOrganizationId,
    rating: 0,
  });

  if (existing) {
    logger.warn('Duplicate organization review attempt', {
      authorUserId,
      targetOrganizationId,
    });
    return next(
      httpError(
        409,
        'You have already left a review for this organization',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await createUserToOrganizationReviewService({
    authorUserId,
    targetOrganizationId,
    rating,
    comment,
  });

  logger.info('User to organization review created', {
    authorUserId,
    targetOrganizationId,
  });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.REVIEW_CREATED,
    data: review,
  });
};

const createUserToPlatformReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { rating, comment } = req.body;

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'PLATFORM',
    rating: 0,
  });

  if (existing) {
    logger.warn('Duplicate platform review attempt', { authorUserId });
    return next(
      httpError(
        409,
        'You have already left a review for this platform',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await createUserToPlatformReviewService({
    authorUserId,
    rating,
    comment,
  });

  logger.info('User to platform review created', { authorUserId });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.REVIEW_CREATED,
    data: review,
  });
};

const createTaskUserReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, 'Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id; //from authMiddleware
  const { taskId } = req.params;
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('User attempted to review themselves', { authorUserId });
    return next(
      httpError(
        400,
        'You cannot leave a review for yourself',
        ErrorCode.REVIEW_SELF_FORBIDDEN
      )
    );
  }

  //Отримуємо таск разом з host ш його типом
  const task = await getTaskByIdService(Number(taskId));

  if (!task) {
    logger.warn('Task not found', { taskId });
    return next(
      httpError(404, 'Task not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  //Перевіряємо чи автор є хостом і його типом
  const isHostUser =
    task.host.type === 'USER' && task.host.user?.id === authorUserId;

  if (!isHostUser) {
    logger.warn('Forbidden task review attempt', {
      authorUserId,
      taskId,
    });
    return next(
      httpError(
        403,
        'Only the host of the task can leave reviews',
        ErrorCode.REVIEW_FORBIDDEN
      )
    );
  }

  //Перевіряємо на дубль відгуку
  const existing = await checkReviewExistsService({
    authorType: 'HOST',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    logger.warn('Duplicate task review attempt', {
      authorUserId,
      targetUserId,
      taskId,
    });
    return next(
      httpError(
        409,
        'You have already left a review for this user',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  //Створюємо відгук 
  const review = await createUserToUserReviewService({
    authorType: 'HOST',
    authorUserId,
    targetUserId,
    taskId: Number(taskId),
    rating,
    comment,
  });

  logger.info('Task user review created', {
    authorUserId,
    targetUserId,
    taskId,
  });

  res.status(201).json({
    status: 'success',
    code: SuccessCode.REVIEW_CREATED,
    data: review,
  });
};


const getReviewById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reviewId = Number(req.params.id);

  const review = await getReviewByIdService(reviewId);

  if (!review) {
    logger.warn('Review not found', { reviewId });
    return next(
      httpError(404, 'Review not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEW_RETRIEVED,
    data: review,
  });
};

const getUserReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.params.id;

  const reviews = await getUserReviewsService(userId);

  if (!reviews) {
    logger.warn('User reviews not found', { userId });
    return next(
      httpError(404, 'Reviews not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
    data: { reviews },
  });
};

const getReviews = async (req: Request, res: Response) => {
  const { type, target_id, status } = req.query;
  const user = req.user;

  const filters: any = {};

  if (type === 'user' && target_id) {
    filters.review_type = 'USER';
    filters.target_id = target_id;
  } else if (type === 'organization' && target_id) {
    filters.review_type = 'ORGANIZATION';
    filters.target_id = target_id;
  } else if (type === 'platform') {
    filters.review_type = 'PLATFORM';
  }

  if (!user?.siteRole || !['ADMIN', 'MODERATOR'].includes(user.siteRole)) {
    filters.status = 'APPROVED';
  } else if (status) {
    filters.status = String(status).toUpperCase();
  }

  const reviews = await getReviewsService(filters);

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
    data: { reviews },
  });
};


const updateReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reviewId = Number(req.params.id);

  const updatedReview = await updateReviewService(reviewId, req.body);

  if (!updatedReview) {
    logger.warn('Review not found for update', { reviewId });
    return next(
      httpError(404, 'Review not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEW_UPDATED,
    data: updatedReview,
  });
};

const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const reviewId = Number(req.params.id);

  const deleted = await deleteReviewsService(reviewId);

  if (!deleted) {
    logger.warn('Review not found for delete', { reviewId });
    return next(
      httpError(404, 'Review not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEW_DELETED,
  });
};

export const controllers = {
  createUserToUserReviewController: asyncHandler(
    createUserToUserReviewController
  ),
  createUserToOrganizationReviewController: asyncHandler(
    createUserToOrganizationReviewController
  ),
  createUserToPlatformReviewController: asyncHandler(
    createUserToPlatformReviewController
  ),
  createTaskUserReviewController: asyncHandler(
    createTaskUserReviewController
  ),
  getReviewById: asyncHandler(getReviewById),
  getUserReviews: asyncHandler(getUserReviews),
  getReviews: asyncHandler(getReviews),
  updateReview: asyncHandler(updateReview),
  deleteReview: asyncHandler(deleteReview),
};
