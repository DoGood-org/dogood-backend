import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  ReviewListItemV1,
  ReviewListRecordV1,
  ReviewRecordV1,
  ReviewResponseV1,
  ReviewTargetTypeV1,
  ReviewV1,
  UpdatedReviewRecordV1,
  UpdatedReviewV1,
} from 'src/review/interfaces/review';

@Injectable()
export class ReviewMapperV1 {
  toReviewResponse<T>(data: T, code: SuccessCode): ReviewResponseV1<T> {
    return { status: 'success', code, data };
  }

  toReview(targetType: ReviewTargetTypeV1, record: ReviewRecordV1): ReviewV1 {
    const {
      id,
      rating,
      comment,
      authorType,
      authorUserId,
      authorOrganizationId,
      status,
      createdAt,
      updatedAt,
      ...targetIds
    } = record;

    return {
      id,
      rating,
      comment,
      authorType,
      authorUserId,
      authorOrganizationId,
      targetType,
      ...targetIds,
      status,
      createdAt,
      updatedAt,
    };
  }

  // NOTE: `||` (not `??`) is the legacy formatter: an empty or null value falls through to the
  // organization author, and a missing avatar ends up `undefined`, dropping the key from the JSON.
  toReviewListItem(
    targetType: ReviewTargetTypeV1,
    record: ReviewListRecordV1,
  ): ReviewListItemV1 {
    const { authorUser, authorOrganization, ...reviewRecord } = record;

    return {
      ...this.toReview(targetType, reviewRecord),
      author: {
        id: authorUser?.id || authorOrganization?.id,
        name: authorUser?.name || authorOrganization?.name,
        avatar:
          authorUser?.userProfile?.avatar || authorOrganization?.avatarUrl,
      },
    };
  }

  toUpdatedReview(
    targetType: ReviewTargetTypeV1,
    record: UpdatedReviewRecordV1,
  ): UpdatedReviewV1 {
    const {
      id,
      authorType,
      authorUserId,
      authorOrganizationId,
      rating,
      comment,
      updatedAt,
      ...targetIds
    } = record;

    return {
      id,
      authorType,
      authorUserId,
      authorOrganizationId,
      targetType,
      ...targetIds,
      rating,
      comment,
      updatedAt,
    };
  }
}
