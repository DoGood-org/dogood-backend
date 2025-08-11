import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { getCache, setCache } from '@utils/cache';
import { createReviewInput, UpdateReviewInput } from '@/types/review.types';
import { httpError } from '@/helpers/httpError';
import { Review } from '@prisma/client';

export const createReviewService = async (data: createReviewInput) => {
  const review = await prisma.review.create({
    data: {
      authorId: data.authorId,
      targetId: data.targetId,
      rating: data.rating,
      comment: data.comment,
    },
  });

  logger.info('✅ Review created successfully', { review });

  await refreshAllReviewCache(data.authorId);

  return review;
};

export const getReviewByIdService = async (id: string) => {
  const cacheKey = `review:${id}`;

  try {
    const cached = await getCache<Review>(cacheKey);

    if (cached) {
      logger.info('✅ Review returned from cache successfully');
      return cached;
    }
  } catch (error) {
    logger.error('❌ Failed to fetch reviews from cache', { error });
  }

  const review = await prisma.review.findUnique({ where: { id } });

  if (review) {
    try {
      await setCache(cacheKey, review);
    } catch (error) {
      logger.error('❌ Failed to set review to cache', { error });
    }
  }

  return review;
};

export const getUserReviewsService = async (userId: number) => {
  const cacheKey = 'userReviews:all';

  const cached = await getCache<Review[]>(cacheKey);
  if (cached) {
    logger.info('✅ Reviews returned from cache successfully');
    return cached;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw httpError(404, `User with id ${userId} not found`);
  }

  const reviews = await prisma.review.findMany({
    where: { authorId: userId },
  });

  await refreshAllReviewCache(userId);

  return reviews;
};

export const updateReviewService = async (
  id: string,
  data: UpdateReviewInput
) => {
  const cacheKey = `review:${id}`;

  const review = await prisma.review.update({
    where: { id },
    data,
    select: {
      id: true,
      authorId: true,
      targetId: true,
      rating: true,
      comment: true,
    },
  });

  await setCache(cacheKey, review);

  return review;
};

export const deleteReviewsService = async (id: string) => {
  const existingReview = await prisma.review.findUnique({ where: { id } });

  if (!existingReview) {
    throw httpError(404, `Review with id ${id} not found`);
  }

  const deletedReview = await prisma.review.delete({
    where: { id },
  });

  const userId = existingReview.authorId;

  await refreshAllReviewCache(userId);

  logger.info('✅ Review deleted and cache updated', { id });

  return deletedReview;
};

const refreshAllReviewCache = async (userId: number) => {
  const reviews = await prisma.review.findMany({
    where: { authorId: userId },
  });

  if (reviews.length > 0) {
    await setCache('userReviews:all', reviews);
  }
};
