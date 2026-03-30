import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';
import { ErrorCode, SuccessCode } from '@/constants/apiCodes';
import { IReviewFilters, reviewServices } from '@/services/review.service';
import { taskServices } from '@/services/task.service';
import { formatReviewResponse } from '@/utils/reviewFormatter';


const createUserToUserReviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(
      httpError(401, '❌ Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('❌ User attempted to review themselves', { authorUserId });
    return next(
      httpError(
        400,
        '❌ You cannot leave a review for yourself',
        ErrorCode.REVIEW_SELF_FORBIDDEN
      )
    );
  }

  const existing = await reviewServices.checkReviewExists({
    authorType: 'USER',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    logger.warn('❌ Duplicate user review attempt', {
      authorUserId,
      targetUserId,
    });
    return next(
      httpError(
        409,
        '❌ You have already left a review for this user',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await reviewServices.createUserToUserReview({
    authorUserId,
    targetUserId,
    rating,
    comment,
  });

  logger.info('✅ User to user review created', {
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
      httpError(401, '❌ Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { targetOrganizationId, rating, comment } = req.body;

  const existing = await reviewServices.checkReviewExists({
    authorType: 'USER',
    authorUserId,
    targetType: 'ORGANIZATION',
    targetOrganizationId,
    rating: 0,
  });

  if (existing) {
    logger.warn('❌ Duplicate organization review attempt', {
      authorUserId,
      targetOrganizationId,
    });
    return next(
      httpError(
        409,
        '❌ You have already left a review for this organization',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await reviewServices.createUserToOrganizationReview({
    authorUserId,
    targetOrganizationId,
    rating,
    comment,
  });

  logger.info('✅ User to organization review created', {
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
      httpError(401, '❌ Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id;
  const { rating, comment } = req.body;

  const existing = await reviewServices.checkReviewExists({
    authorType: 'USER',
    authorUserId,
    targetType: 'PLATFORM',
    rating: 0,
  });

  if (existing) {
    logger.warn('❌ Duplicate platform review attempt', { authorUserId });
    return next(
      httpError(
        409,
        '❌ You have already left a review for this platform',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await reviewServices.createUserToPlatformReview({
    authorUserId,
    rating,
    comment,
  });

  logger.info('✅ User to platform review created', { authorUserId });

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
      httpError(401, '❌ Not authenticated', ErrorCode.AUTH_UNAUTHORIZED)
    );
  }

  const authorUserId = req.user.id; 
  const { taskId } = req.params;
  const { targetUserId, rating, comment } = req.body;

  if (authorUserId === targetUserId) {
    logger.warn('❌ User attempted to review themselves', { authorUserId });
    return next(
      httpError(
        400,
        '❌ You cannot leave a review for yourself',
        ErrorCode.REVIEW_SELF_FORBIDDEN
      )
    );
  }


  const task = await taskServices.getTaskById(taskId);

  if (!task) {
    logger.warn('❌ Task not found', { taskId });
    return next(
      httpError(404, '❌ Task not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  const isHostUser =
    task.host.type === 'USER' && task.host.user?.id === authorUserId;

  if (!isHostUser) {
    logger.warn('❌ Forbidden task review attempt', {
      authorUserId,
      taskId,
    });
    return next(
      httpError(
        403,
        '❌ Only the host of the task can leave reviews',
        ErrorCode.REVIEW_FORBIDDEN
      )
    );
  }

  const existing = await reviewServices.checkReviewExists({
    authorType: 'HOST',
    authorUserId,
    targetType: 'USER',
    targetUserId,
    rating: 0,
  });

  if (existing) {
    logger.warn('❌ Duplicate task review attempt', {
      authorUserId,
      targetUserId,
      taskId,
    });
    return next(
      httpError(
        409,
        '❌ You have already left a review for this user',
        ErrorCode.REVIEW_ALREADY_EXISTS
      )
    );
  }

  const review = await reviewServices.createUserToUserReview({
    authorType: 'HOST',
    authorUserId,
    targetUserId,
    taskId: Number(taskId),
    rating,
    comment,
  });

  logger.info('✅ Task user review created', {
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

  const review = await reviewServices.getReviewById(reviewId);

  if (!review) {
    logger.warn('❌ Review not found', { reviewId });
    return next(
      httpError(404, 'Review not found', ErrorCode.REVIEW_NOT_FOUND)
    );
  }

  logger.info('✅ Review retrieved', { reviewId });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEW_RETRIEVED,
    data: review,
  });
};

const getUserReviews = async (req: Request, res: Response) => {
  const { id } = req.params; 

  const reviews = await reviewServices.getReviews({
    review_type: 'USER',
    target_id: id,
    status: 'APPROVED'
  });

  logger.info('✅ User reviews retrieved', { userId: id, count: reviews.length });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
     data: { reviews: formatReviewResponse(reviews) },
  });
};

const getOrgReviews = async (req: Request, res: Response) => {
  const { id } = req.params; 

  const reviews = await reviewServices.getReviews({
    review_type: 'ORGANIZATION',
    target_id: id,
    status: 'APPROVED'
  });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
    data: { reviews: formatReviewResponse(reviews) },
  });
};

const getPlatformReviews = async (req: Request, res: Response) => {
  
  const reviews = await reviewServices.getReviews({
    review_type: 'PLATFORM',
    status: 'APPROVED' 
  });

  logger.info('✅ Platform reviews retrieved', { count: reviews.length });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
    data: { reviews: formatReviewResponse(reviews) },
  });
};

const getAdminReviews = async (req: Request, res: Response,  next: NextFunction) => {
  const user = req.user;

  if (!user?.siteRole || !['ADMIN', 'MODERATOR'].includes(user.siteRole)) {
    logger.warn('Unauthorized access to admin reviews', { userId: user?.id, siteRole: user?.siteRole });
    return next( httpError(403, 'Access denied. Admins only.'));
  }

  const { type, target_id, status } = req.query;

  const filters: IReviewFilters = {
    ...(type && { review_type: (type as string).toUpperCase() as any }),
    ...(target_id && { target_id: target_id as string }),
    ...(status && { status: (status as string).toUpperCase() as any })
  };

  const reviews = await reviewServices.getReviews(filters);


  logger.info('✅ Admin reviews retrieved', { filters, count: reviews.length });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEWS_RETRIEVED,
    data: { reviews: formatReviewResponse(reviews) },
  });
};
  
const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  const reviewId = Number(req.params.id);
  const user = req.user;
  const { rating, comment } = req.body;

  const review = await reviewServices.getReviewById(reviewId);

  if (!review) {
    return next(httpError(404, '❌ Review not found', ErrorCode.REVIEW_NOT_FOUND));
  }

  if (review.authorUserId !== user?.id) {
    return next(httpError(403, '❌ Only the author can edit their review'));
  }

  const updateData = {
    rating,
    comment,
    status: 'PENDING' 
  };

  const updatedReview = await reviewServices.updateReview(reviewId, updateData);

  logger.info('✅ Review updated and sent to re-moderation', { reviewId, authorId: user?.id });

  res.status(200).json({
    status: 'success',
    code: SuccessCode.REVIEW_UPDATED,
    data: updatedReview,
  });
};

const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  const reviewId = Number(req.params.id);
  const user = req.user;

  const review = await reviewServices.getReviewById(reviewId);

  if (!review) {
    return next(httpError(404, '❌ Review not found', ErrorCode.REVIEW_NOT_FOUND));
  }

  const isAuthor = review.authorUserId === user?.id;
  const isAdmin = user?.siteRole && ['ADMIN', 'MODERATOR'].includes(user.siteRole);

  if (!isAuthor && !isAdmin) {
    return next(httpError(403, '❌ You do not have permission to delete this review'));
  }

  await reviewServices.deleteReview(reviewId);

  logger.info('✅ Review deleted', { reviewId, deletedBy: user?.id });

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
  getOrgReviews: asyncHandler(getOrgReviews),
  getPlatformReviews: asyncHandler(getPlatformReviews),
  getAllReviewsForAdmin: asyncHandler(getAdminReviews),
  updateReview: asyncHandler(updateReview),
  deleteReview: asyncHandler(deleteReview),
};
