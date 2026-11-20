import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  reviewSchemaV1,
  updatedReviewSchemaV1,
} from 'src/review/dtos/generic/v1/review.dto';
import {
  ReviewDeletedResponseV1,
  ReviewResponseV1,
  ReviewV1,
  UpdatedReviewV1,
} from 'src/review/interfaces/review';

const reviewResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.enum([SuccessCode.REVIEW_CREATED, SuccessCode.REVIEW_MODERATED]),
  data: reviewSchemaV1,
});

const updateReviewResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEW_UPDATED),
  data: updatedReviewSchemaV1,
});

const deleteReviewResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEW_DELETED),
});

export class ReviewResponseDtoV1
  extends createZodDto(reviewResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<ReviewV1>> {}

export class UpdateReviewResponseDtoV1
  extends createZodDto(updateReviewResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<UpdatedReviewV1>> {}

export class DeleteReviewResponseDtoV1
  extends createZodDto(deleteReviewResponseSchemaV1)
  implements JsonSerialized<ReviewDeletedResponseV1> {}
