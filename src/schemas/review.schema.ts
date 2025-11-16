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
  organizationId: z
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

export const schemas = {
  userReviewSchema,
  orgReviewSchema,
  platformReviewSchema,
  getReviewsSchema,
};
