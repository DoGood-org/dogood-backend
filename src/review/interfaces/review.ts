import { ReviewAuthorType, ReviewStatus } from '@prisma/client';
import { SuccessCode } from '@shared/constants/api-codes';

// NOTE: the review table is the discriminator; the legacy `targetType` column no longer exists.
export enum ReviewTargetTypeV1 {
  USER = 'USER',
  ORGANIZATION = 'ORGANIZATION',
  TASK = 'TASK',
  PLATFORM = 'PLATFORM',
}

export enum AdminReviewTypeV1 {
  USER = 'user',
  ORGANIZATION = 'organization',
  PLATFORM = 'platform',
}

export type ModeratedReviewStatusV1 = Exclude<
  ReviewStatus,
  typeof ReviewStatus.PENDING
>;

export interface CreateUserReviewDataV1 {
  targetUserId: string;
  rating: number;
  comment?: string | null;
}

export interface CreateOrganizationReviewDataV1 {
  targetOrganizationId: string;
  rating: number;
  comment?: string | null;
}

export interface CreatePlatformReviewDataV1 {
  rating: number;
  comment?: string | null;
}

export interface UpdateReviewDataV1 {
  rating?: number;
  comment?: string;
}

export interface ModerateReviewDataV1 {
  status: ModeratedReviewStatusV1;
}

export interface AdminReviewsParamsV1 {
  type?: AdminReviewTypeV1;
  status?: ReviewStatus;
  target_id?: string;
}

export interface ReviewTargetIdsV1 {
  targetUserId?: string;
  targetOrganizationId?: string;
  taskId?: string;
  hostId?: string;
}

export interface ReviewRecordV1 extends ReviewTargetIdsV1 {
  id: string;
  rating: number;
  comment: string | null;
  authorType: ReviewAuthorType;
  authorUserId: string | null;
  authorOrganizationId: string | null;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewListRecordV1 extends ReviewRecordV1 {
  authorUser: {
    id: string;
    name: string;
    userProfile: { avatar: string | null } | null;
  } | null;
  authorOrganization: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface UpdatedReviewRecordV1 extends ReviewTargetIdsV1 {
  id: string;
  authorType: ReviewAuthorType;
  authorUserId: string | null;
  authorOrganizationId: string | null;
  rating: number;
  comment: string | null;
  updatedAt: Date;
}

export interface ReviewV1 extends ReviewRecordV1 {
  targetType: ReviewTargetTypeV1;
}

export interface ReviewAuthorV1 {
  id: string | undefined;
  name: string | undefined;
  avatar: string | null | undefined;
}

export interface ReviewListItemV1 extends ReviewV1 {
  author: ReviewAuthorV1;
}

export interface UpdatedReviewV1 extends UpdatedReviewRecordV1 {
  targetType: ReviewTargetTypeV1;
}

export interface ReviewLookupResultV1 {
  targetType: ReviewTargetTypeV1;
  authorUserId: string | null;
}

export interface ModeratedReviewResultV1 {
  review: ReviewV1;
  targetName: string;
  targetReceiverIds: string[];
}

export interface ReviewListV1 {
  reviews: ReviewListItemV1[];
}

export interface ReviewResponseV1<T> {
  status: 'success';
  code: SuccessCode;
  data: T;
}

export interface ReviewDeletedResponseV1 {
  status: 'success';
  code: SuccessCode;
}
