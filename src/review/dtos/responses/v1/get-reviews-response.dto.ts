import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  platformReviewListItemSchemaV1,
  reviewListItemSchemaV1,
} from 'src/review/dtos/generic/v1/review.dto';
import {
  PlatformReviewListV1,
  ReviewListV1,
  ReviewResponseV1,
} from 'src/review/interfaces/review';

const getReviewsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEWS_RETRIEVED),
  data: z.object({ reviews: z.array(reviewListItemSchemaV1) }),
});

const getPlatformReviewsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEWS_RETRIEVED),
  data: z.object({ reviews: z.array(platformReviewListItemSchemaV1) }),
});

export class GetPlatformReviewsResponseDtoV1
  extends createZodDto(getPlatformReviewsResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<PlatformReviewListV1>> {}

export class GetReviewsResponseDtoV1
  extends createZodDto(getReviewsResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<ReviewListV1>> {}
