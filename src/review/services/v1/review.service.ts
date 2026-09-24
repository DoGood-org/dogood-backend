import { HttpStatus, Injectable } from '@nestjs/common';
import {
  EntityType,
  HostType,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
  ReviewAuthorType,
  ReviewStatus,
  SiteRole,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import {
  AdminReviewsParamsV1,
  AdminReviewTypeV1,
  CreateOrganizationReviewDataV1,
  CreatePlatformReviewDataV1,
  CreateUserReviewDataV1,
  ModeratedReviewResultV1,
  ModeratedReviewStatusV1,
  ModerateReviewDataV1,
  ReviewDeletedResponseV1,
  ReviewListItemV1,
  ReviewListV1,
  ReviewLookupResultV1,
  ReviewResponseV1,
  ReviewTargetTypeV1,
  ReviewV1,
  UpdatedReviewV1,
  UpdateReviewDataV1,
} from 'src/review/interfaces/review';
import { ReviewMapperV1 } from 'src/review/mappers/v1/review.mapper';

const REVIEW_NOT_FOUND_MESSAGE = '❌ Review not found';
const SELF_REVIEW_MESSAGE = '❌ You cannot leave a review for yourself';
const DUPLICATE_USER_REVIEW_MESSAGE =
  '❌ You have already left a review for this user';
const PLATFORM_TARGET_NAME = 'Platform';
const ORGANIZATION_STAFF_ROLES: OrganizationRole[] = [
  OrganizationRole.ADMIN,
  OrganizationRole.MODERATOR,
];

// NOTE: legacy `httpError` without a third argument answers with no machine-readable code.
const codelessV1Exception = (
  statusCode: HttpStatus,
  message: string,
): V1ApiException =>
  new V1ApiException(statusCode, message, ErrorCode.FORBIDDEN, {
    status: 'error',
    statusCode,
    code: null,
    message,
  });

@Injectable()
export class ReviewServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationServiceV2,
    private readonly reviewMapper: ReviewMapperV1,
  ) {}

  async createUserReview(
    authorUserId: string,
    data: CreateUserReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { targetUserId } = data;

    this.assertNotSelfReview(authorUserId, targetUserId);

    return await this.createReviewOfUser(
      ReviewAuthorType.USER,
      authorUserId,
      data,
    );
  }

  async createTaskUserReview(
    authorUserId: string,
    taskId: string,
    data: CreateUserReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { targetUserId } = data;

    this.assertNotSelfReview(authorUserId, targetUserId);

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { host: { select: { type: true, userId: true } } },
    });

    // NOTE: legacy answers a missing task with REVIEW_NOT_FOUND.
    if (!task) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        '❌ Task not found',
        ErrorCode.REVIEW_NOT_FOUND,
      );
    }

    const { host } = task;

    if (host.type !== HostType.USER || host.userId !== authorUserId) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        '❌ Only the host of the task can leave reviews',
        ErrorCode.REVIEW_FORBIDDEN,
      );
    }

    // NOTE: legacy never checks that the target took part in the task (TECH_DEBT).
    return await this.createReviewOfUser(
      ReviewAuthorType.HOST,
      authorUserId,
      data,
    );
  }

  async createOrganizationReview(
    authorUserId: string,
    data: CreateOrganizationReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { targetOrganizationId, rating, comment } = data;
    const existingReview = await this.prisma.organizationReview.findFirst({
      where: {
        authorType: ReviewAuthorType.USER,
        authorUserId,
        targetOrganizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        '❌ You have already left a review for this organization',
        ErrorCode.REVIEW_ALREADY_EXISTS,
      );
    }

    const organization = await this.prisma.organization.findFirst({
      where: { id: targetOrganizationId, deletedAt: null },
      select: { id: true },
    });

    if (!organization) {
      throw codelessV1Exception(HttpStatus.NOT_FOUND, 'Organization not found');
    }

    const review = await this.prisma.organizationReview.create({
      data: {
        rating,
        comment: comment ?? null,
        authorType: ReviewAuthorType.USER,
        authorUserId,
        targetOrganizationId,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        targetOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.reviewMapper.toReviewResponse(
      this.reviewMapper.toReview(ReviewTargetTypeV1.ORGANIZATION, review),
      SuccessCode.REVIEW_CREATED,
    );
  }

  async createPlatformReview(
    authorUserId: string,
    data: CreatePlatformReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { rating, comment } = data;
    const existingReview = await this.prisma.systemReview.findFirst({
      where: {
        authorType: ReviewAuthorType.USER,
        authorUserId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        '❌ You have already left a review for this platform',
        ErrorCode.REVIEW_ALREADY_EXISTS,
      );
    }

    const review = await this.prisma.systemReview.create({
      data: {
        rating,
        comment: comment ?? null,
        authorType: ReviewAuthorType.USER,
        authorUserId,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.reviewMapper.toReviewResponse(
      this.reviewMapper.toReview(ReviewTargetTypeV1.PLATFORM, review),
      SuccessCode.REVIEW_CREATED,
    );
  }

  async getUserReviews(
    targetUserId: string,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    const reviews = await this.findUserReviews({
      targetUserId,
      status: ReviewStatus.APPROVED,
    });

    return this.reviewMapper.toReviewResponse(
      { reviews },
      SuccessCode.REVIEWS_RETRIEVED,
    );
  }

  async getOrganizationReviews(
    targetOrganizationId: string,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    const reviews = await this.findOrganizationReviews({
      targetOrganizationId,
      status: ReviewStatus.APPROVED,
    });

    return this.reviewMapper.toReviewResponse(
      { reviews },
      SuccessCode.REVIEWS_RETRIEVED,
    );
  }

  async getPlatformReviews(): Promise<ReviewResponseV1<ReviewListV1>> {
    const reviews = await this.findSystemReviews({
      status: ReviewStatus.APPROVED,
    });

    return this.reviewMapper.toReviewResponse(
      { reviews },
      SuccessCode.REVIEWS_RETRIEVED,
    );
  }

  async getAdminReviews(
    params: AdminReviewsParamsV1,
  ): Promise<ReviewResponseV1<ReviewListV1>> {
    const { type, status, target_id: targetId } = params;
    const reviews = await this.findAdminReviews(type, status, targetId);

    return this.reviewMapper.toReviewResponse(
      { reviews },
      SuccessCode.REVIEWS_RETRIEVED,
    );
  }

  async updateReview(
    id: string,
    userId: string,
    data: UpdateReviewDataV1,
  ): Promise<ReviewResponseV1<UpdatedReviewV1>> {
    const foundReview = await this.findReviewById(id);

    if (!foundReview) {
      throw this.reviewNotFoundException();
    }

    const { targetType, authorUserId } = foundReview;

    if (authorUserId !== userId) {
      throw codelessV1Exception(
        HttpStatus.FORBIDDEN,
        '❌ Only the author can edit their review',
      );
    }

    const review = await this.updateReviewContent(targetType, id, data);

    return this.reviewMapper.toReviewResponse(
      review,
      SuccessCode.REVIEW_UPDATED,
    );
  }

  async deleteReview(
    id: string,
    userId: string,
    role: string,
  ): Promise<ReviewDeletedResponseV1> {
    const foundReview = await this.findReviewById(id);

    if (!foundReview) {
      throw this.reviewNotFoundException();
    }

    const { targetType, authorUserId } = foundReview;

    if (authorUserId !== userId && role !== SiteRole.ADMIN) {
      throw codelessV1Exception(
        HttpStatus.FORBIDDEN,
        '❌ You do not have permission to delete this review',
      );
    }

    await this.deleteReviewRow(targetType, id);

    return { status: 'success', code: SuccessCode.REVIEW_DELETED };
  }

  async moderateReview(
    id: string,
    data: ModerateReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { status } = data;
    const foundReview = await this.findReviewById(id);

    if (!foundReview) {
      throw this.reviewNotFoundException();
    }

    const { targetType, authorUserId } = foundReview;
    const { review, targetName, targetReceiverIds } =
      await this.updateReviewStatus(targetType, id, status);

    if (authorUserId) {
      const authorNotificationType =
        status === ReviewStatus.APPROVED
          ? NotificationType.REVIEW_APPROVED
          : NotificationType.REVIEW_REJECTED;

      await this.notificationService.createNotification({
        userId: authorUserId,
        type: authorNotificationType,
        relatedId: id,
        entityType: EntityType.REVIEW,
        params: { targetName },
      });
    }

    if (status === ReviewStatus.APPROVED) {
      const receivedTargetName =
        targetType === ReviewTargetTypeV1.USER ? 'you' : targetName;

      await Promise.all(
        targetReceiverIds.map((userId) =>
          this.notificationService.createNotification({
            userId,
            type: NotificationType.REVIEW_RECEIVED,
            relatedId: id,
            entityType: EntityType.REVIEW,
            params: { targetName: receivedTargetName },
          }),
        ),
      );
    }

    return this.reviewMapper.toReviewResponse(
      review,
      SuccessCode.REVIEW_MODERATED,
    );
  }

  private assertNotSelfReview(
    authorUserId: string,
    targetUserId: string,
  ): void {
    if (authorUserId === targetUserId) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        SELF_REVIEW_MESSAGE,
        ErrorCode.REVIEW_SELF_FORBIDDEN,
      );
    }
  }

  private reviewNotFoundException(): V1ApiException {
    return new V1ApiException(
      HttpStatus.NOT_FOUND,
      REVIEW_NOT_FOUND_MESSAGE,
      ErrorCode.REVIEW_NOT_FOUND,
    );
  }

  // NOTE: the duplicate check is scoped by author type, so a HOST review and a USER review of the
  // same pair do not block each other.
  private async createReviewOfUser(
    authorType: ReviewAuthorType,
    authorUserId: string,
    data: CreateUserReviewDataV1,
  ): Promise<ReviewResponseV1<ReviewV1>> {
    const { targetUserId, rating, comment } = data;
    const existingReview = await this.prisma.userReview.findFirst({
      where: { authorType, authorUserId, targetUserId, deletedAt: null },
      select: { id: true },
    });

    if (existingReview) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        DUPLICATE_USER_REVIEW_MESSAGE,
        ErrorCode.REVIEW_ALREADY_EXISTS,
      );
    }

    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    });

    if (!targetUser) {
      throw codelessV1Exception(HttpStatus.NOT_FOUND, 'Target user not found');
    }

    const review = await this.prisma.userReview.create({
      data: {
        rating,
        comment: comment ?? null,
        authorType,
        authorUserId,
        targetUserId,
        status: ReviewStatus.PENDING,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        targetUserId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.reviewMapper.toReviewResponse(
      this.reviewMapper.toReview(ReviewTargetTypeV1.USER, review),
      SuccessCode.REVIEW_CREATED,
    );
  }

  private async findAdminReviews(
    type: AdminReviewTypeV1 | undefined,
    status: ReviewStatus | undefined,
    targetId: string | undefined,
  ): Promise<ReviewListItemV1[]> {
    switch (type) {
      case AdminReviewTypeV1.USER:
        return await this.findUserReviews({ targetUserId: targetId, status });
      case AdminReviewTypeV1.ORGANIZATION:
        return await this.findOrganizationReviews({
          targetOrganizationId: targetId,
          status,
        });
      case AdminReviewTypeV1.PLATFORM:
        return await this.findSystemReviews({ status });
      case undefined: {
        const reviewLists = await Promise.all([
          this.findUserReviews({ status }),
          this.findOrganizationReviews({ status }),
          this.findTaskReviews({ status }),
          this.findSystemReviews({ status }),
        ]);

        // NOTE: same order as each query: createdAt desc, then id asc.
        return reviewLists
          .flat()
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime() ||
              (left.id < right.id ? -1 : 1),
          );
      }
    }
  }

  private async findUserReviews(
    where: Prisma.UserReviewWhereInput,
  ): Promise<ReviewListItemV1[]> {
    const reviews = await this.prisma.userReview.findMany({
      where: { ...where, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        targetUserId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        authorUser: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
        authorOrganization: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return reviews.map((review) =>
      this.reviewMapper.toReviewListItem(ReviewTargetTypeV1.USER, review),
    );
  }

  private async findOrganizationReviews(
    where: Prisma.OrganizationReviewWhereInput,
  ): Promise<ReviewListItemV1[]> {
    const reviews = await this.prisma.organizationReview.findMany({
      where: { ...where, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        targetOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        authorUser: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
        authorOrganization: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return reviews.map((review) =>
      this.reviewMapper.toReviewListItem(
        ReviewTargetTypeV1.ORGANIZATION,
        review,
      ),
    );
  }

  private async findTaskReviews(
    where: Prisma.TaskReviewWhereInput,
  ): Promise<ReviewListItemV1[]> {
    const reviews = await this.prisma.taskReview.findMany({
      where: { ...where, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        taskId: true,
        hostId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        authorUser: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
        authorOrganization: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return reviews.map((review) =>
      this.reviewMapper.toReviewListItem(ReviewTargetTypeV1.TASK, review),
    );
  }

  private async findSystemReviews(
    where: Prisma.SystemReviewWhereInput,
  ): Promise<ReviewListItemV1[]> {
    const reviews = await this.prisma.systemReview.findMany({
      where: { ...where, deletedAt: null },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      select: {
        id: true,
        rating: true,
        comment: true,
        authorType: true,
        authorUserId: true,
        authorOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        authorUser: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
        authorOrganization: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return reviews.map((review) =>
      this.reviewMapper.toReviewListItem(ReviewTargetTypeV1.PLATFORM, review),
    );
  }

  // NOTE: review ids are uuids unique per table; the legacy single `Review` table is split in four.
  private async findReviewById(
    id: string,
  ): Promise<ReviewLookupResultV1 | null> {
    const where = { id, deletedAt: null };
    const select = { authorUserId: true };
    const [userReview, organizationReview, taskReview, systemReview] =
      await Promise.all([
        this.prisma.userReview.findFirst({ where, select }),
        this.prisma.organizationReview.findFirst({ where, select }),
        this.prisma.taskReview.findFirst({ where, select }),
        this.prisma.systemReview.findFirst({ where, select }),
      ]);

    if (userReview) {
      return { targetType: ReviewTargetTypeV1.USER, ...userReview };
    }

    if (organizationReview) {
      return {
        targetType: ReviewTargetTypeV1.ORGANIZATION,
        ...organizationReview,
      };
    }

    if (taskReview) {
      return { targetType: ReviewTargetTypeV1.TASK, ...taskReview };
    }

    if (systemReview) {
      return { targetType: ReviewTargetTypeV1.PLATFORM, ...systemReview };
    }

    return null;
  }

  private async updateReviewContent(
    targetType: ReviewTargetTypeV1,
    id: string,
    reviewData: UpdateReviewDataV1,
  ): Promise<UpdatedReviewV1> {
    const { rating, comment } = reviewData;
    // NOTE: every edit sends the review back to moderation.
    const data = { rating, comment, status: ReviewStatus.PENDING };
    const select = {
      id: true,
      authorType: true,
      authorUserId: true,
      authorOrganizationId: true,
      rating: true,
      comment: true,
      updatedAt: true,
    };

    switch (targetType) {
      case ReviewTargetTypeV1.USER: {
        const review = await this.prisma.userReview.update({
          where: { id },
          data,
          select: { ...select, targetUserId: true },
        });

        return this.reviewMapper.toUpdatedReview(targetType, review);
      }
      case ReviewTargetTypeV1.ORGANIZATION: {
        const review = await this.prisma.organizationReview.update({
          where: { id },
          data,
          select: { ...select, targetOrganizationId: true },
        });

        return this.reviewMapper.toUpdatedReview(targetType, review);
      }
      case ReviewTargetTypeV1.TASK: {
        const review = await this.prisma.taskReview.update({
          where: { id },
          data,
          select: { ...select, taskId: true, hostId: true },
        });

        return this.reviewMapper.toUpdatedReview(targetType, review);
      }
      case ReviewTargetTypeV1.PLATFORM: {
        const review = await this.prisma.systemReview.update({
          where: { id },
          data,
          select,
        });

        return this.reviewMapper.toUpdatedReview(targetType, review);
      }
    }
  }

  private async deleteReviewRow(
    targetType: ReviewTargetTypeV1,
    id: string,
  ): Promise<void> {
    const where = { id };
    const select = { id: true };

    switch (targetType) {
      case ReviewTargetTypeV1.USER:
        await this.prisma.userReview.delete({ where, select });
        break;
      case ReviewTargetTypeV1.ORGANIZATION:
        await this.prisma.organizationReview.delete({ where, select });
        break;
      case ReviewTargetTypeV1.TASK:
        await this.prisma.taskReview.delete({ where, select });
        break;
      case ReviewTargetTypeV1.PLATFORM:
        await this.prisma.systemReview.delete({ where, select });
        break;
    }
  }

  // NOTE: `targetReceiverIds` are the users told about an APPROVED review: the target user, or the
  // ACTIVE admins and moderators of the target organization. Task and platform reviews have none.
  private async updateReviewStatus(
    targetType: ReviewTargetTypeV1,
    id: string,
    status: ModeratedReviewStatusV1,
  ): Promise<ModeratedReviewResultV1> {
    const where = { id };
    const data = { status };
    const select = {
      id: true,
      rating: true,
      comment: true,
      authorType: true,
      authorUserId: true,
      authorOrganizationId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    };

    switch (targetType) {
      case ReviewTargetTypeV1.USER: {
        const { targetUser, ...review } = await this.prisma.userReview.update({
          where,
          data,
          select: {
            ...select,
            targetUserId: true,
            targetUser: { select: { name: true } },
          },
        });

        return {
          review: this.reviewMapper.toReview(targetType, review),
          targetName: targetUser.name || PLATFORM_TARGET_NAME,
          targetReceiverIds: [review.targetUserId],
        };
      }
      case ReviewTargetTypeV1.ORGANIZATION: {
        const { targetOrganization, ...review } =
          await this.prisma.organizationReview.update({
            where,
            data,
            select: {
              ...select,
              targetOrganizationId: true,
              targetOrganization: {
                select: {
                  name: true,
                  members: {
                    where: {
                      role: { in: ORGANIZATION_STAFF_ROLES },
                      status: MembershipStatus.ACTIVE,
                      deletedAt: null,
                    },
                    select: { userId: true },
                  },
                },
              },
            },
          });
        const { name, members } = targetOrganization;

        return {
          review: this.reviewMapper.toReview(targetType, review),
          targetName: name || PLATFORM_TARGET_NAME,
          targetReceiverIds: members.map(({ userId }) => userId),
        };
      }
      case ReviewTargetTypeV1.TASK: {
        const review = await this.prisma.taskReview.update({
          where,
          data,
          select: { ...select, taskId: true, hostId: true },
        });

        return {
          review: this.reviewMapper.toReview(targetType, review),
          targetName: PLATFORM_TARGET_NAME,
          targetReceiverIds: [],
        };
      }
      case ReviewTargetTypeV1.PLATFORM: {
        const review = await this.prisma.systemReview.update({
          where,
          data,
          select,
        });

        return {
          review: this.reviewMapper.toReview(targetType, review),
          targetName: PLATFORM_TARGET_NAME,
          targetReceiverIds: [],
        };
      }
    }
  }
}
