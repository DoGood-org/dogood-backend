import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { adminReviewListItemSchemaV1 } from 'src/review/dtos/generic/v1/review.dto';
import {
  AdminReviewListItemV1,
  AdminReviewListV1,
  ReviewResponseV1,
} from 'src/review/interfaces/review';

const getAdminReviewsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEWS_RETRIEVED),
  data: z.object({ reviews: z.array(adminReviewListItemSchemaV1) }),
});

const getAdminReviewResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEW_RETRIEVED),
  data: adminReviewListItemSchemaV1,
});

export class GetAdminReviewsResponseDtoV1
  extends createZodDto(getAdminReviewsResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<AdminReviewListV1>> {}

export class GetAdminReviewResponseDtoV1
  extends createZodDto(getAdminReviewResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<AdminReviewListItemV1>> {}
