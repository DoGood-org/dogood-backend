import { z } from 'zod';

export const userReviewSchema = z.object({
  targetUserId: z
    .string({ invalid_type_error: 'targetUserId must be a string' })
    .uuid({ message: 'targetUserId must be a valid UUID' }),

  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int({ message: 'Rating must be an integer' })
    .min(1, { message: 'Rating must be at least 1' })
    .max(5, { message: 'Rating must be at most 5' }),

  comment: z
    .string({ invalid_type_error: 'Comment must be a string' })
    .trim()
    .max(1000, { message: 'Comment is too long' })
    .optional()
    .nullable(),
});

export const orgReviewSchema = z.object({
  targetOrganizationId: z
    .string({ invalid_type_error: 'organizationId must be a string' })
    .uuid({ message: 'organizationId must be a valid UUID' }),

  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int({ message: 'Rating must be an integer' })
    .min(1, { message: 'Rating must be at least 1' })
    .max(5, { message: 'Rating must be at most 5' }),

  comment: z
    .string({ invalid_type_error: 'Comment must be a string' })
    .trim()
    .max(1000, { message: 'Comment is too long' })
    .optional()
    .nullable(),
});

export const platformReviewSchema = z.object({
  rating: z
    .number({ invalid_type_error: 'Rating must be a number' })
    .int({ message: 'Rating must be an integer' })
    .min(1, { message: 'Rating must be at least 1' })
    .max(5, { message: 'Rating must be at most 5' }),

  comment: z
    .string({ invalid_type_error: 'Comment must be a string' })
    .trim()
    .max(1000, { message: 'Comment is too long' })
    .optional()
    .nullable(),
});

const getReviewsSchema = z.object({
  type: z.enum(['user', 'organisation', 'platform']).optional(),
  target_id: z.string().optional(),
  status: z.enum(['approved', 'pending', 'rejected']).optional(),
});

const authorTypeEnum = z.enum(['USER', 'ORGANIZATION']);
const targetTypeEnum = z.enum(['USER', 'ORGANIZATION', 'PLATFORM']);
const reviewStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const updateReviewSchema = z.object({
  authorType: authorTypeEnum.optional(),
  authorUserId: z.string().uuid().optional(),
  authorOrganizationId: z.string().uuid().optional(),

  targetType: targetTypeEnum.optional(),
  targetUserId: z.string().uuid().optional(),
  targetOrganizationId: z.string().uuid().optional(),
  targetPlatformId: z.string().uuid().optional(),

  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),

  status: reviewStatusEnum.optional(),
});

export const schemas = {
  userReviewSchema,
  orgReviewSchema,
  platformReviewSchema,
  getReviewsSchema,
  updateReviewSchema,
};
