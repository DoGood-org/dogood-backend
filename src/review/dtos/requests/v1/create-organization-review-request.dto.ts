import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  reviewCommentSchemaV1,
  reviewRatingSchemaV1,
} from 'src/review/dtos/requests/v1/create-user-review-request.dto';
import { CreateOrganizationReviewDataV1 } from 'src/review/interfaces/review';

const createOrganizationReviewRequestSchemaV1 = z.object({
  targetOrganizationId: z.uuid({
    message: 'organizationId must be a valid UUID',
  }),
  rating: reviewRatingSchemaV1,
  comment: reviewCommentSchemaV1,
});

export class CreateOrganizationReviewRequestDtoV1
  extends createZodDto(createOrganizationReviewRequestSchemaV1)
  implements CreateOrganizationReviewDataV1 {}
