import { ReviewStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  AdminReviewsParamsV1,
  AdminReviewTypeV1,
} from 'src/review/interfaces/review';

// NOTE: legacy nested these under a `query` key that `req.query` never has, so the route always
// answered 400; the flat shape is the intended contract (task Decision 1).
export const getAdminReviewsRequestSchemaV1 = z.object({
  type: z.enum(AdminReviewTypeV1).optional(),
  status: z
    .enum([
      'pending',
      'approved',
      'rejected',
      ReviewStatus.PENDING,
      ReviewStatus.APPROVED,
      ReviewStatus.REJECTED,
    ])
    .transform((status) => status.toUpperCase())
    .pipe(z.enum(ReviewStatus))
    .optional(),
  target_id: z.uuid({ message: 'Invalid Target ID format' }).optional(),
});

export class GetAdminReviewsRequestDtoV1
  extends createZodDto(getAdminReviewsRequestSchemaV1)
  implements AdminReviewsParamsV1 {}
