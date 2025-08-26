import { Request, Response } from 'express';
import { asyncHandler } from '@/decorators/asyncHandler';
import {
  createReviewService,
  deleteReviewsService,
  getReviewByIdService,
  getReviewsService,
  getUserReviewsService,
  updateReviewService,
} from '@/services/review.service';
import { httpError } from '@/helpers/httpError';
import logger from '@/utils/logger';

const createReview = async (req: Request, res: Response) => {
  const review = await createReviewService(req.body);

  res.status(201).json({
    status: 'success',
    message: 'New review was created',
    data: { review },
  });
};

const getReviewById = async (req: Request, res: Response) => {
  const reviewId = req.params.id;

  const foundReview = await getReviewByIdService(reviewId);

  if (!foundReview) {
    logger.warn('Review was not found', { reviewId });
    return httpError(404, 'Review not found');
  }

  res.status(200).json({
    status: 'success',
    data: {
      reviews: foundReview,
    },
  });
};

const getUserReviews = async (req: Request, res: Response) => {
  const userId = +req.params.id;

  const reviews = await getUserReviewsService(userId);

  if (!reviews) {
    logger.warn('Review was not found', { userId });
    return httpError(404, 'Review not found');
  }

  res.status(200).json({
    status: 'success',
    data: {
      reviews: reviews,
    },
  });
};

const updateReview = async (req: Request, res: Response) => {
  const reviewId = req.params.id;

  const foundReview = await getReviewByIdService(reviewId);

  if (!foundReview) {
    logger.warn('Review was not found', { reviewId });
    return httpError(404, `Review with id ${reviewId} not found`);
  }

  const updatedReview = await updateReviewService(reviewId, req.body);

  res.status(200).json({
    status: 'success',
    message: 'Review was updated successfully',
    data: {
      review: updatedReview,
    },
  });
};

const deleteReview = async (req: Request, res: Response) => {
  const reviewId = req.params.id;

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
  createReview: asyncHandler(createReview),
  getReviewById: asyncHandler(getReviewById),
  getUserReviews: asyncHandler(getUserReviews),
  deleteReview: asyncHandler(deleteReview),
  updateReview: asyncHandler(updateReview),
  getReviews: asyncHandler(getReviews),
};
