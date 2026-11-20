import { ReviewAuthorType, ReviewStatus } from '@prisma/client';
import { JsonSerialized } from '@shared/types/json-serialized';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  ReviewListItemV1,
  ReviewTargetTypeV1,
  ReviewV1,
  UpdatedReviewV1,
} from 'src/review/interfaces/review';

const reviewTargetIdsSchemaV1 = z.object({
  targetUserId: z.string().optional(),
  targetOrganizationId: z.string().optional(),
  taskId: z.string().optional(),
  hostId: z.string().optional(),
});

export const reviewSchemaV1 = reviewTargetIdsSchemaV1.extend({
  id: z.string(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  authorType: z.enum(ReviewAuthorType),
  authorUserId: z.string().nullable(),
  authorOrganizationId: z.string().nullable(),
  status: z.enum(ReviewStatus),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  targetType: z.enum(ReviewTargetTypeV1),
});

export const reviewListItemSchemaV1 = reviewSchemaV1.extend({
  author: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    avatar: z.string().nullable().optional(),
  }),
});

export const updatedReviewSchemaV1 = reviewTargetIdsSchemaV1.extend({
  id: z.string(),
  authorType: z.enum(ReviewAuthorType),
  authorUserId: z.string().nullable(),
  authorOrganizationId: z.string().nullable(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  updatedAt: z.iso.datetime(),
  targetType: z.enum(ReviewTargetTypeV1),
});

export class ReviewDtoV1
  extends createZodDto(reviewSchemaV1)
  implements JsonSerialized<ReviewV1> {}

export class ReviewListItemDtoV1
  extends createZodDto(reviewListItemSchemaV1)
  implements JsonSerialized<ReviewListItemV1> {}

export class UpdatedReviewDtoV1
  extends createZodDto(updatedReviewSchemaV1)
  implements JsonSerialized<UpdatedReviewV1> {}
