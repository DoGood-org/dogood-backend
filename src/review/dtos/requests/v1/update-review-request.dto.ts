import { ReviewStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UpdateReviewDataV1 } from 'src/review/interfaces/review';

// NOTE: legacy validates every field below but writes only `rating` and `comment`; the rest are
// kept so the same bodies are accepted and rejected.
const updateReviewRequestSchemaV1 = z.object({
  authorType: z.enum(['USER', 'ORGANIZATION']).optional(),
  authorUserId: z.uuid().optional(),
  authorOrganizationId: z.uuid().optional(),
  targetType: z.enum(['USER', 'ORGANIZATION', 'PLATFORM']).optional(),
  targetUserId: z.uuid().optional(),
  targetOrganizationId: z.uuid().optional(),
  targetPlatformId: z.uuid().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional(),
  status: z.enum(ReviewStatus).optional(),
});

export class UpdateReviewRequestDtoV1
  extends createZodDto(updateReviewRequestSchemaV1)
  implements UpdateReviewDataV1 {}
