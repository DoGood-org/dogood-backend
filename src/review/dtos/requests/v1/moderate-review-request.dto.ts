import { ReviewStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ModerateReviewDataV1 } from 'src/review/interfaces/review';

const moderateReviewRequestSchemaV1 = z.object({
  status: z.enum([ReviewStatus.APPROVED, ReviewStatus.REJECTED], {
    error: (issue): string | undefined => {
      if (issue.input === undefined) {
        return 'Status is required';
      }

      return typeof issue.input === 'string'
        ? undefined
        : "Status must be either 'APPROVED' or 'REJECTED'";
    },
  }),
});

export class ModerateReviewRequestDtoV1
  extends createZodDto(moderateReviewRequestSchemaV1)
  implements ModerateReviewDataV1 {}
