import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateUserReviewDataV1 } from 'src/review/interfaces/review';

export const reviewRatingSchemaV1 = z
  .number({ message: 'Rating must be a number' })
  .int({ message: 'Rating must be an integer' })
  .min(1, { message: 'Rating must be at least 1' })
  .max(5, { message: 'Rating must be at most 5' });

export const reviewCommentSchemaV1 = z
  .string({ message: 'Comment must be a string' })
  .trim()
  .max(1000, { message: 'Comment is too long' })
  .optional()
  .nullable();

const createUserReviewRequestSchemaV1 = z.object({
  targetUserId: z.uuid({ message: 'targetUserId must be a valid UUID' }),
  rating: reviewRatingSchemaV1,
  comment: reviewCommentSchemaV1,
});

export class CreateUserReviewRequestDtoV1
  extends createZodDto(createUserReviewRequestSchemaV1)
  implements CreateUserReviewDataV1 {}
