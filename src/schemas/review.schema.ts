import { z } from 'zod';

const createReviewSchema = z.object({
    authorId: z
        .number({ invalid_type_error: 'authorId must be a number' })
        .int()
        .positive({ message: 'authorId must be a positive integer' }),
    targetId: z
        .number({ invalid_type_error: 'targetId must be a number' })
        .int()
        .positive({ message: 'targetId must be a positive integer' }),
    rating: z
        .number({ invalid_type_error: 'Rating must be a number' }).min(1).max(5)
        .int()
        .positive({ message: 'rating must be a positive integer' }),
    comment: z
        .string({invalid_type_error: 'Comment must be a string',})
        .optional()
        .nullable()

});

export const schemas = { createReviewSchema };
