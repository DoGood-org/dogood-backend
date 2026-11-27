import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  AdminReviewListItemV1,
  AdminReviewListRecordV1,
  ReviewListItemV1,
  ReviewListRecordV1,
  ReviewRecordV1,
  ReviewResponseV1,
  ReviewTargetNameV1,
  ReviewTargetTypeV1,
  ReviewV1,
  UpdatedReviewRecordV1,
  UpdatedReviewV1,
} from 'src/review/interfaces/review';

const PLATFORM_TARGET_NAME = 'Platform';

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

  toAdminReviewListItem(
    targetType: ReviewTargetTypeV1,
    record: AdminReviewListRecordV1,
  ): AdminReviewListItemV1 {
    const { targetUser, targetOrganization, task, ...listRecord } = record;
    const { authorUser, authorOrganization } = listRecord;
    const { author, ...review } = this.toReviewListItem(targetType, listRecord);

    return {
      ...review,
      targetName: this.toReviewTargetName(targetType, {
        targetUser,
        targetOrganization,
        task,
      }),
      author: {
        ...author,
        email: authorUser?.email || authorOrganization?.email || null,
      },
    };
  }

  // NOTE: a platform review has no target row, so its target is the fixed "Platform" name.
  private toReviewTargetName(
    targetType: ReviewTargetTypeV1,
    targets: Pick<
      AdminReviewListRecordV1,
      'targetUser' | 'targetOrganization' | 'task'
    >,
  ): ReviewTargetNameV1 | null {
    const { targetUser, targetOrganization, task } = targets;

    switch (targetType) {
      case ReviewTargetTypeV1.USER:
        return targetUser
          ? {
              id: targetUser.id,
              name: targetUser.name,
              avatar: targetUser.userProfile?.avatar ?? null,
            }
          : null;
      case ReviewTargetTypeV1.ORGANIZATION:
        return targetOrganization
          ? {
              id: targetOrganization.id,
              name: targetOrganization.name,
              avatar: targetOrganization.avatarUrl,
            }
          : null;
      case ReviewTargetTypeV1.TASK:
        return task
          ? { id: task.id, name: task.title, avatar: task.imageUrl }
          : null;
      case ReviewTargetTypeV1.PLATFORM:
        return { id: null, name: PLATFORM_TARGET_NAME, avatar: null };
    }
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
