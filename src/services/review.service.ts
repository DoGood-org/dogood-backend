import { prisma } from '@/lib/prisma';
import logger from '@/utils/logger';
import {
  createReviewInput,
  UpdateReviewInput,
} from '@/types/review.types';
import { httpError } from '@/helpers/httpError';
import {
  ReviewAuthorType,
  ReviewStatus,
  ReviewTargetType,
} from '@prisma/client';

interface CreateUserToUserReviewInput {
  authorUserId: string;
  targetUserId: string;
  rating: number;
  comment?: string;
  authorType?: ReviewAuthorType; 
  taskId?: number; 
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

export interface IReviewFilters {
  review_type?: 'USER' | 'ORGANIZATION' | 'PLATFORM';
  target_id?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const PLATFORM_ID = process.env.PLATFORM_ID || null;

/**
 * Creates a review from one user to another.
 *
 * @param {CreateUserToUserReviewInput} input - Data for the user-to-user review.
 * @returns {Promise<Review>} - The created review object.
 */
const createUserToUserReview = async ({
  authorUserId,
  targetUserId,
  rating,
  comment,
}: CreateUserToUserReviewInput) => {
  if (authorUserId === targetUserId) {
    logger.warn('Attempt to create self-review', { authorUserId });
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

/**
 * Creates a review from a user to an organization.
 *
 * @param {CreateUserToOrganizationReviewInput} input - Data for the organization review.
 * @returns {Promise<Review>} - The created review object.
 */
const createUserToOrganizationReview = async ({
  authorUserId,
  targetOrganizationId,
  rating,
  comment,
}: CreateUserToOrganizationReviewInput) => {
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

/**
 * Creates a review from a user to the platform.
 *
 * @param {CreateUserToPlatformReviewInput} input - Data for the platform review.
 * @returns {Promise<Review>} - The created review object.
 */
const createUserToPlatformReview = async ({
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
      platformId: PLATFORM_ID,
      status: ReviewStatus.PENDING,
    },
  });

  logger.info('✅ User-to-platform review created', {
    reviewId: review.id,
    authorUserId,
  });

  return review;
};

/**
 * Fetches a single review by its ID.
 *
 * @param {number} id - The unique ID of the review.
 * @returns {Promise<Review | null>} - The review if found, otherwise null.
 */
const getReviewById = async (id: number) => {

  const review = await prisma.review.findUnique({ where: { id } });
  logger.info('✅ Review fetched from database', { id, review });

  return review;
};

/**
 * Updates an existing review's data.
 *
 * @param {number} id - The ID of the review to update.
 * @param {UpdateReviewInput} data - The updated fields.
 * @returns {Promise<Partial<Review>>} - The updated review with selected fields.
 */
const updateReview = async (id: number, data: UpdateReviewInput) => {
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
      platformId: true,
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

  return review;
};

/**
 * Deletes a review by its unique ID.
 *
 * @param {number} id - The ID of the review to delete.
 * @returns {Promise<Review>} - The deleted review object.
 */
const deleteReview = async (id: number) => {
  const exists = await reviewExists(id);

  if (!exists) {
    logger.warn(`❌ Review was not found`, { id });
    throw httpError(404, `Review with id ${id} not found`);
  }

  const deletedReview = await prisma.review.delete({
    where: { id },
  });

  logger.info('✅ Review deleted and cache updated', { id });

  return deletedReview;
};

/**
 * Retrieves a list of reviews based on provided filters.
 *
 * @param {IReviewFilters} filters - Filter criteria (type, target ID, status).
 * @returns {Promise<Review[]>} - An array of reviews including author details.
 */
const getReviews = async (filters: IReviewFilters) => {
  return prisma.review.findMany({
    where: {
      ...(filters.review_type === 'USER' && { targetUserId: filters.target_id }),
      ...(filters.review_type === 'ORGANIZATION' && { targetOrganizationId: filters.target_id }),
      ...(filters.review_type === 'PLATFORM' && { platformId: filters.target_id }),
      ...(filters.status && { status: filters.status }),
    },
    include: {
      authorUser: {
        select: {
          id: true,
          name: true,
          profile: { 
            select: {
              avatar: true 
            }
          }
        }
      },
      authorOrganization: {
        select: {
          id: true,
          name: true,
          avatar: true, 
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Checks if a review already exists for the given author and target combination.
 *
 * @param {createReviewInput} data - The author and target information.
 * @returns {Promise<Review | null>} - The existing review if found, otherwise null.
 */
const checkReviewExists = async (data: createReviewInput) => {
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

/**
 * Verifies the existence of a review in the database.
 *
 * @param {number} id - The review ID.
 * @returns {Promise<boolean>} - True if it exists, false otherwise.
 */
const reviewExists = async (id: number): Promise<boolean> => {
  const review = await prisma.review.findUnique({ where: { id } });
  const exists = !!review;

  logger.info(`Review existence check for id ${id}: ${exists}`, { id });

  return exists;
};

/**
 * Checks if a user exists in the database by their ID.
 *
 * @param {string} userId - The user's unique ID.
 * @returns {Promise<boolean>} - True if the user exists.
 */
const isUserExist = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return !!user;
};

/**
 * Updates the moderation status of a review.
 *
 * @param {number} id - The ID of the review.
 * @param {ReviewStatus} status - The new status (APPROVED, REJECTED).
 * @returns {Promise<Review>} - The updated review object.
 */
const updateReviewStatus = async (id: number, status: ReviewStatus) => {
  const review = await prisma.review.update({
    where: { id },
    data: { status },
  });

  logger.info(`⚖️ Review status updated to ${status}`, { reviewId: id });

  return review;
};

export const reviewServices = {
  createUserToUserReview,
  createUserToOrganizationReview,
  createUserToPlatformReview,
  getReviewById,
  updateReview,
  deleteReview,
  getReviews,
  checkReviewExists,
  reviewExists,
  isUserExist,
  updateReviewStatus
};