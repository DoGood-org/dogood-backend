import { SuccessCode } from '@shared/constants/api-codes';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { reviewListItemSchemaV1 } from 'src/review/dtos/generic/v1/review.dto';
import { ReviewListV1, ReviewResponseV1 } from 'src/review/interfaces/review';

const getReviewsResponseSchemaV1 = z.object({
  status: z.literal('success'),
  code: z.literal(SuccessCode.REVIEWS_RETRIEVED),
  data: z.object({ reviews: z.array(reviewListItemSchemaV1) }),
});

export class GetReviewsResponseDtoV1
  extends createZodDto(getReviewsResponseSchemaV1)
  implements JsonSerialized<ReviewResponseV1<ReviewListV1>> {}
