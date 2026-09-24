import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  reviewCommentSchemaV1,
  reviewRatingSchemaV1,
} from 'src/review/dtos/requests/v1/create-user-review-request.dto';
import { CreatePlatformReviewDataV1 } from 'src/review/interfaces/review';

const createPlatformReviewRequestSchemaV1 = z.object({
  rating: reviewRatingSchemaV1,
  comment: reviewCommentSchemaV1,
});

export class CreatePlatformReviewRequestDtoV1
  extends createZodDto(createPlatformReviewRequestSchemaV1)
  implements CreatePlatformReviewDataV1 {}
