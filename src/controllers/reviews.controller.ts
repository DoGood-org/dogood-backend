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

const createUserToUserReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Not authenticated'));
  }

  const authorUserId = req.user.id; // from authMiddleware
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('User attempted to review themselves', { authorUserId });
    return next(httpError(400, 'You cannot leave a review for yourself'));
  }

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    return next(httpError(409, 'You have already left a review for this user'));
  }

  const review = await createUserToUserReviewService({
    authorUserId,
    targetUserId,
    rating,
    comment,
  });

  logger.info('User to user review created', { authorUserId, targetUserId });

  res.status(201).json({
    status: 'success',
    data: review,
  });
};

const createUserToOrganizationReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Not authenticated'));
  }
  const authorUserId = req.user.id; // from authMiddleware
  const { targetOrganizationId, rating, comment } = req.body;

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'ORGANIZATION',
    targetOrganizationId,
    rating: 0,
  });

  if (existing) {
    return next(
      httpError(409, 'You have already left a review for this organization')
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
    data: review,
  });
};

const createUserToPlatformReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Not authenticated'));
  }
  const authorUserId = req.user.id; // from authMiddleware
  const { rating, comment } = req.body;

  const existing = await checkReviewExistsService({
    authorType: 'USER',
    authorUserId,
    targetType: 'PLATFORM',
    rating: 0,
  });

  if (existing) {
    return next(
      httpError(409, 'You have already left a review for this platform')
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
    data: review,
  });
};

const createTaskUserReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(httpError(401, 'Not authenticated'));
  }

  const authorUserId = req.user.id; // from authMiddleware
  const { taskId } = req.params;
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('User attempted to review themselves', { authorUserId });
    return next(httpError(400, 'You cannot leave a review for yourself'));
  }

  // Отримуємо таск разом з host і його типом
  const task = await getTaskByIdService(Number(taskId));

  if (!task) {
    return next(httpError(404, 'Task not found'));
  }

  // Перевіряємо чи автор є хостом таску
  const isHostUser =
    task.host.type === 'USER' && task.host.user?.id === authorUserId;

  if (!isHostUser) {
    logger.warn('User attempted to review without being task host', {
      authorUserId,
      taskId,
    });
    return next(
      httpError(
        403,
        'Only the host of the task can leave reviews for participants'
      )
    );
  }

  // Перевірка на дубль відгуку
  const existing = await checkReviewExistsService({
    authorType: 'HOST',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    logger.warn('User attempted to leave duplicate review', {
      authorUserId,
      targetUserId,
      taskId,
    });
    return next(httpError(409, 'You have already left a review for this user'));
  }

  // Створюємо відгук
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
    data: review,
  });
};


const getReviewById = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.id);

  const foundReview = await getReviewByIdService(reviewId);

  if (!foundReview) {
    logger.warn('Review was not found', { reviewId });
    return httpError(404, 'Review not found');
  }

  res.status(200).json({
    status: 'success',
    data: { foundReview },
  });
};

const getUserReviews = async (req: Request, res: Response) => {
  const userId = req.params.id;

  const reviews = await getUserReviewsService(userId);

  if (!reviews) {
    logger.warn('Review was not found', { userId });
    return httpError(404, 'Review not found');
  }

  res.status(200).json({
    status: 'success',
    data: { reviews },
  });
};

const updateReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.id);

  const foundReview = await getReviewByIdService(reviewId);

  if (!foundReview) {
    logger.warn('Review was not found', { reviewId });
    return httpError(404, `Review with id ${reviewId} not found`);
  }

  const updatedReview = await updateReviewService(reviewId, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Review was updated successfully',
    data: { updatedReview },
  });
};

const deleteReview = async (req: Request, res: Response) => {
  const reviewId = Number(req.params.id);

  const foundReview = await deleteReviewsService(reviewId);

  if (!foundReview) {
    logger.warn('Review was not found', { reviewId });
    return httpError(404, `Review with id ${reviewId} not found`);
  }

  res.status(200).json({
    status: 'success',
    message: 'Review was deleted successfully',
  });
};

const getReviews = async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const target_id = req.query.target_id as string;
  const status = req.query.status as string;
  const user = req.user;

  const filters: any = {};

  if (type === 'user') {
    if (!target_id) {
      logger.warn('Target_id is required', { type });
      return httpError(400, 'target_id is required');
    }
    filters.review_type = 'USER';
    filters.target_id = target_id;
  } else if (type === 'organisation') {
    if (!target_id) {
      logger.warn('Target_id is required', { type });
      return httpError(400, 'target_id is required');
    }
    filters.review_type = 'ORGANISATION';
    filters.target_id = target_id;
  } else if (type === 'platform') {
    filters.review_type = 'PLATFORM';
  }

  if (!user?.siteRole || !['ADMIN', 'MODERATOR'].includes(user.siteRole)) {
    filters.status = 'APPROVED';
  } else if (status) {
    filters.status = status.toUpperCase();
  }

  const reviews = await getReviewsService(filters);

  res.status(200).json({
    status: 'success',
    data: { reviews },
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
  createTaskUserReviewController: asyncHandler(createTaskUserReviewController),
  getReviewById: asyncHandler(getReviewById),
  getUserReviews: asyncHandler(getUserReviews),
  deleteReview: asyncHandler(deleteReview),
  updateReview: asyncHandler(updateReview),
  getReviews: asyncHandler(getReviews),
};
