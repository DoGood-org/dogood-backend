import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import { getCache, setCache } from '@utils/cache';
import {
  createReviewInput,
  getReviewsFilters,
  UpdateReviewInput,
} from '@/types/review.types';
import { httpError } from '@/helpers/httpError';
import {
  Review,
  ReviewAuthorType,
  ReviewStatus,
  ReviewTargetType,
} from '@prisma/client';

interface CreateUserToUserReviewInput {
  authorUserId: string;
  targetUserId: string;
  rating: number;
  comment?: string | null;
}

interface CreateUserToOrganizationReviewInput {
  authorUserId: string;
  targetOrganizationId: string;
  rating: number;
  comment?: string | null;
}

interface CreateUserToPlatformReviewInput {
  authorUserId: string;
  rating: number;
  comment?: string | null;
}

export const createUserToUserReviewService = async ({
  authorUserId,
  targetUserId,
  rating,
  comment,
}: CreateUserToUserReviewInput) => {
  if (authorUserId === targetUserId) {
    throw httpError(400, 'You cannot leave a review for yourself');
  }

  const [author, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorUserId } }),
    prisma.user.findUnique({ where: { id: targetUserId } }),
  ]);

  if (!author) {
    logger.warn('Author user not found when creating review', { authorUserId });
    throw httpError(404, 'Author user not found');
  }

  if (!target) {
    logger.warn('Target user not found when creating review', { targetUserId });
    throw httpError(404, 'Target user not found');
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment: comment ?? null,
      authorType: ReviewAuthorType.USER,
      authorUserId,
      targetType: ReviewTargetType.USER,
      targetUserId,
      status: ReviewStatus.PENDING,
    },
  });

  logger.info('✅ User-to-user review created', {
    reviewId: review.id,
    authorUserId,
    targetUserId,
  });

  return review;
};

export const createUserToOrganizationReviewService = async ({
  authorUserId,
  targetOrganizationId,
  rating,
  comment,
}: CreateUserToOrganizationReviewInput) => {
  // Перевірка існування юзера й організації
  const [author, organization] = await Promise.all([
    prisma.user.findUnique({ where: { id: authorUserId } }),
    prisma.organization.findUnique({ where: { id: targetOrganizationId } }),
  ]);

  if (!author) {
    logger.warn('Author user not found when creating org review', {
      authorUserId,
    });
    throw httpError(404, 'Author user not found');
  }

  if (!organization) {
    logger.warn('Target organization not found when creating review', {
      targetOrganizationId,
    });
    throw httpError(404, 'Organization not found');
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment: comment ?? null,
      authorType: ReviewAuthorType.USER,
      authorUserId,
      targetType: ReviewTargetType.ORGANIZATION,
      targetOrganizationId,
      status: ReviewStatus.PENDING,
    },
  });

  logger.info('✅ User-to-organization review created', {
    reviewId: review.id,
    authorUserId,
    targetOrganizationId,
  });

  return review;
};
const PLATFORM_ID = process.env.PLATFORM_ID || null;

export const createUserToPlatformReviewService = async ({
  authorUserId,
  rating,
  comment,
}: CreateUserToPlatformReviewInput) => {
  if (!PLATFORM_ID) {
    throw httpError(500, 'Platform ID is not configured');
  }

  const author = await prisma.user.findUnique({
    where: { id: authorUserId },
  });

  if (!author) {
    logger.warn('Author user not found when creating platform review', {
      authorUserId,
    });
    throw httpError(404, 'Author user not found');
  }

  // Перевіримо, що платформа існує (одноразово це все одно закешується на рівні БД)
  const platform = await prisma.platform.findUnique({
    where: { id: PLATFORM_ID },
  });

  if (!platform) {
    logger.error('Platform not found with PLATFORM_ID', { PLATFORM_ID });
    throw httpError(500, 'Platform not configured correctly');
  }

  const review = await prisma.review.create({
    data: {
      rating,
      comment: comment ?? null,
      authorType: ReviewAuthorType.USER,
      authorUserId,
      targetType: ReviewTargetType.PLATFORM,
      targetPlatformId: PLATFORM_ID,
      status: ReviewStatus.PENDING,
    },
  });

  logger.info('✅ User-to-platform review created', {
    reviewId: review.id,
    authorUserId,
  });

  return review;
};

export const getReviewByIdService = async (id: string) => {
  const cacheReviewKey = `review:${id}`;

  const cached = await getCache<Review>(cacheReviewKey);

  if (cached) {
    logger.info('✅ Review returned from cache successfully');
    return cached;
  }

  const review = await prisma.review.findUnique({ where: { id } });
  logger.info('✅ Review fetched from database', { id, review });

  if (review) {
    await setCache(cacheReviewKey, review);
  }
  logger.info('✅ Review cached successfully', { id });

  return review;
};

export const getUserReviewsService = async (userId: string) => {
  const cacheKey = `userReviews:all:${userId}`;

  const cached = await getCache<Review[]>(cacheKey);
  if (cached) {
    logger.info('✅ Reviews returned from cache successfully', { userId });
    return cached;
  }

  const userExists = await isUserExist(userId);
  if (!userExists) {
    logger.warn(`❌ User with id not found in database`, { userId });
    throw httpError(404, `User with id ${userId} not found`);
  }

  const reviews = await prisma.review.findMany({
    where: { authorUserId: userId },
  });

  logger.info('✅ Reviews fetched from database', {
    userId,
    count: reviews.length,
  });

  await refreshAllReviewCache(userId, 'USER');

  return reviews;
};

export const updateReviewService = async (
  id: string,
  data: UpdateReviewInput
) => {
  const review = await prisma.review.update({
    where: { id },
    data,
    select: {
      id: true,
      authorType: true,
      authorUserId: true,
      authorOrganizationId: true,
      targetType: true,
      targetUserId: true,
      targetOrganizationId: true,
      targetPlatformId: true,
      rating: true,
      comment: true,
      updatedAt: true,
    },
  });

  let cacheKey: string;

  if (review.authorType === 'USER') {
    if (!review.authorUserId) {
      logger.error('Review with authorType=USER but no authorUserId', {
        review,
      });
      throw httpError(500, 'Invalid review data: missing authorUserId');
    }
    cacheKey = review.authorUserId;
  } else {
    if (!review.authorOrganizationId) {
      logger.error(
        'Review with authorType=ORGANIZATION but no authorOrganizationId',
        { review }
      );
      throw httpError(500, 'Invalid review data: missing authorOrganizationId');
    }
    cacheKey = review.authorOrganizationId;
  }
  
  logger.info(
    `✏️ Review updated successfully. ID: ${review.id}, AuthorType: ${review.authorType}, AuthorID: ${cacheKey}, TargetType: ${review.targetType}`,
    { review }
  );

  await setCache(`review:${id}`, review);
  logger.info('✅ Review cache updated successfully', { id });

  await refreshAllReviewCache(cacheKey, review.authorType);

  return review;
};

export const deleteReviewsService = async (id: string) => {
  const exists = await reviewExistsService(id);

  if (!exists) {
    logger.warn(`❌ Review was not found`, { id });
    throw httpError(404, `Review with id ${id} not found`);
  }

  const deletedReview = await prisma.review.delete({
    where: { id },
  });

  const cacheKey =
    deletedReview.authorType === 'USER'
      ? deletedReview.authorUserId!
      : deletedReview.authorOrganizationId!;

  await refreshAllReviewCache(cacheKey, deletedReview.authorType);

  logger.info('✅ Review deleted and cache updated', { id });

  return deletedReview;
};

export const getReviewsService = async (filters: getReviewsFilters) => {
  const where: any = {};

  if (filters.review_type) {
    where.review_type = filters.review_type;
  }

  if (filters.target_id) {
    where.target_id = filters.target_id;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  logger.info('Fetching reviews with filters', { filters });

  return prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
};

export const refreshAllReviewCache = async (
  authorId: string,
  authorType: 'USER' | 'ORGANIZATION'
) => {
  let whereClause: any = {};

  if (authorType === 'USER') {
    whereClause.authorUserId = authorId;
  } else if (authorType === 'ORGANIZATION') {
    whereClause.authorOrganizationId = authorId;
  }

  const reviews = await prisma.review.findMany({
    where: whereClause,
  });

  if (reviews.length > 0) {
    await setCache(`userReviews:all:${authorId}`, reviews);
    logger.info(
      `🔄 Cache refreshed for author ${authorId}. Total reviews cached: ${reviews.length}`,
      { authorId }
    );
  } else {
    logger.info(
      `ℹ️ No reviews found for author ${authorId}. Cache not updated.`,
      {
        authorId,
      }
    );
  }
};

export const checkReviewExistsService = async (data: createReviewInput) => {
  const whereClause: any = {
    authorType: data.authorType,
    targetType: data.targetType,
  };

  if (data.authorType === 'USER' && data.authorUserId) {
    whereClause.authorUserId = data.authorUserId;
  } else if (data.authorType === 'ORGANIZATION' && data.authorOrganizationId) {
    whereClause.authorOrganizationId = data.authorOrganizationId;
  }

  if (data.targetType === 'USER' && data.targetUserId) {
    whereClause.targetUserId = data.targetUserId;
  } else if (data.targetType === 'ORGANIZATION' && data.targetOrganizationId) {
    whereClause.targetOrganizationId = data.targetOrganizationId;
  } else if (data.targetType === 'PLATFORM' && data.targetPlatformId) {
    whereClause.targetPlatformId = data.targetPlatformId;
  }

  const existingReview = await prisma.review.findFirst({ where: whereClause });
  return existingReview;
};

export const reviewExistsService = async (id: string): Promise<boolean> => {
  const review = await prisma.review.findUnique({ where: { id } });
  const exists = !!review;

  logger.info(`Review existence check for id ${id}: ${exists}`, { id });

  return exists;
};

export const isUserExist = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return !!user;
};
