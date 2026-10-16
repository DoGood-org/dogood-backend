import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  FullUserOrganizationV1,
  FullUserRowV1,
  FullUserV1,
  OrganizationTargetReviewRowV1,
  PublicUserOrganizationV1,
  PublicUserReviewV1,
  PublicUserRowV1,
  PublicUserV1,
  ReceivedReviewRowV1,
  TaskTargetReviewRowV1,
  UserDeletedResponseV1,
  UserLocationRowV1,
  UserLocationV1,
  UserMembershipRowV1,
  UserMessageResponseV1,
  UserNameRowV1,
  UserNameV1,
  UserProfileRowV1,
  UserProfileV1,
  UserResponseV1,
  UserReviewBaseRowV1,
  UserReviewTargetTypeV1,
  UserReviewV1,
  UserSettingsRowV1,
  UserSettingsV1,
  UserTargetReviewRowV1,
  UserTaskRowV1,
  UserTaskV1,
} from 'src/user/interfaces/user';

interface ReviewTargetIdsV1 {
  targetUserId: string | null;
  targetOrganizationId: string | null;
  taskId: string | null;
}

@Injectable()
export class UserMapperV1 {
  toUserResponse<T>(data: T, code: SuccessCode): UserResponseV1<T> {
    return { status: 'success', code, data };
  }

  toUserMessageResponse<T>(
    data: T,
    code: SuccessCode,
    message: string,
  ): UserMessageResponseV1<T> {
    return { status: 'success', code, message, data };
  }

  toUserDeletedResponse(): UserDeletedResponseV1 {
    return { status: 'success', code: SuccessCode.USER_DELETED };
  }

  // NOTE: legacy `findFullUserById` + `sanitizeUser`: every user column except secrets, plus the relations.
  toFullUser(row: FullUserRowV1): FullUserV1 {
    const {
      id,
      email,
      name,
      role,
      isEmailVerified,
      status,
      stripeCustomerId,
      createdAt,
      updatedAt,
      ban,
      userSettings,
      userProfile,
      userLocation,
      taskParticipations,
      hostProfile,
      userReviewsWritten,
      orgReviewsWritten,
      taskReviewsWritten,
      systemReviewsWritten,
      reviewsReceived,
      organizations,
    } = row;
    const joinedTasks = taskParticipations.map(({ task }) =>
      this.toUserTask(task),
    );
    const hostedTasks = (hostProfile?.tasks ?? []).map((task) =>
      this.toUserTask(task),
    );

    return {
      id,
      email,
      name,
      siteRole: role,
      isEmailVerified,
      status,
      banType: ban?.banType ?? null,
      banReason: ban?.banReason ?? null,
      banExpiresAt: ban?.banExpiresAt ?? null,
      bannedById: ban?.bannedById ?? null,
      stripeCustomerId,
      createdAt,
      updatedAt,
      userSettings: this.toUserSettings(userSettings),
      profile: this.toUserProfile(userProfile),
      location: this.toUserLocation(userLocation),
      joinedTasks,
      reviewsWrittenUser: [
        ...userReviewsWritten.map((review) => this.toUserTargetReview(review)),
        ...orgReviewsWritten.map((review) =>
          this.toOrganizationTargetReview(review),
        ),
        ...taskReviewsWritten.map((review) => this.toTaskTargetReview(review)),
        ...systemReviewsWritten.map((review) =>
          this.toPlatformTargetReview(review),
        ),
      ],
      reviewsReceived: reviewsReceived.map((review) =>
        this.toUserTargetReview(review),
      ),
      organizations: organizations.map((membership) =>
        this.toFullUserOrganization(membership),
      ),
      tasks: this.mergeUserTasks(hostedTasks, joinedTasks),
    };
  }

  // NOTE: legacy `findPublicProfileById` + `sanitizeUser`; organizations come out in the sanitizeUser shape (`membersCount`).
  toPublicUser(row: PublicUserRowV1): PublicUserV1 {
    const {
      id,
      name,
      createdAt,
      userProfile,
      userLocation,
      taskParticipations,
      hostProfile,
      reviewsReceived,
      organizations,
    } = row;
    const joinedTasks = taskParticipations.map(({ task }) =>
      this.toUserTask(task),
    );
    const hostedTasks = (hostProfile?.tasks ?? []).map((task) =>
      this.toUserTask(task),
    );

    return {
      id,
      name,
      createdAt,
      profile: this.toUserProfile(userProfile),
      location: this.toUserLocation(userLocation),
      joinedTasks,
      reviewsReceived: reviewsReceived.map((review) =>
        this.toPublicUserReview(review),
      ),
      organizations: organizations.map((membership) =>
        this.toPublicUserOrganization(membership),
      ),
      tasks: this.mergeUserTasks(hostedTasks, joinedTasks),
    };
  }

  toUserName(row: UserNameRowV1): UserNameV1 {
    const { id, name, userProfile } = row;

    // NOTE: `||` is the legacy formatter: an empty avatar becomes null too.
    return { id, name, avatar: userProfile?.avatar || null };
  }

  toUserProfile(row: UserProfileRowV1 | null): UserProfileV1 | null {
    if (row === null) {
      return null;
    }

    const { id, userId, bio, avatar, gender, birthDate, phoneNumber } = row;

    return { id, userId, bio, avatar, gender, birthDate, phoneNumber };
  }

  toUserSettings(row: UserSettingsRowV1 | null): UserSettingsV1 | null {
    if (row === null) {
      return null;
    }

    const { id, userId, theme, language } = row;

    return { id, userId, theme, language };
  }

  toUserTask(row: UserTaskRowV1): UserTaskV1 {
    const {
      id,
      title,
      description,
      imageUrl,
      hostId,
      startDate,
      endDate,
      status,
      categories,
      amount,
      currentAmount,
      currency,
      requirements,
      createdAt,
      updatedAt,
      taskLocation,
    } = row;
    const latitude = taskLocation?.latitude ?? null;
    const longitude = taskLocation?.longitude ?? null;

    return {
      id,
      title,
      description,
      picture: imageUrl,
      hostId,
      startDate,
      endDate,
      location:
        latitude === null || longitude === null
          ? null
          : { lat: latitude, lng: longitude },
      locationName: taskLocation?.name ?? null,
      amount,
      currentAmount,
      currency,
      requirements,
      status,
      categories,
      createdAt,
      updatedAt,
    };
  }

  // NOTE: legacy `mergeUserTasks`: hosted tasks first, then joined tasks not already in the list.
  private mergeUserTasks(
    hostedTasks: UserTaskV1[],
    joinedTasks: UserTaskV1[],
  ): UserTaskV1[] {
    const tasksById = new Map<string, UserTaskV1>();

    for (const task of hostedTasks) {
      tasksById.set(task.id, task);
    }

    for (const task of joinedTasks) {
      if (!tasksById.has(task.id)) {
        tasksById.set(task.id, task);
      }
    }

    return Array.from(tasksById.values());
  }

  private toUserLocation(row: UserLocationRowV1 | null): UserLocationV1 | null {
    if (row === null) {
      return null;
    }

    const { id, country, region, city } = row.location;

    return { id, country, region, city };
  }

  private toUserTargetReview(review: UserTargetReviewRowV1): UserReviewV1 {
    const { targetUserId } = review;

    return this.toUserReview(review, UserReviewTargetTypeV1.USER, {
      targetUserId,
      targetOrganizationId: null,
      taskId: null,
    });
  }

  private toOrganizationTargetReview(
    review: OrganizationTargetReviewRowV1,
  ): UserReviewV1 {
    const { targetOrganizationId } = review;

    return this.toUserReview(review, UserReviewTargetTypeV1.ORGANIZATION, {
      targetUserId: null,
      targetOrganizationId,
      taskId: null,
    });
  }

  private toTaskTargetReview(review: TaskTargetReviewRowV1): UserReviewV1 {
    const { taskId } = review;

    return this.toUserReview(review, UserReviewTargetTypeV1.TASK, {
      targetUserId: null,
      targetOrganizationId: null,
      taskId,
    });
  }

  private toPlatformTargetReview(review: UserReviewBaseRowV1): UserReviewV1 {
    return this.toUserReview(review, UserReviewTargetTypeV1.PLATFORM, {
      targetUserId: null,
      targetOrganizationId: null,
      taskId: null,
    });
  }

  // NOTE: the legacy single `Review` row, rebuilt from the four review tables; `platformId` no longer exists.
  private toUserReview(
    review: UserReviewBaseRowV1,
    targetType: UserReviewTargetTypeV1,
    targetIds: ReviewTargetIdsV1,
  ): UserReviewV1 {
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
    } = review;
    const { targetUserId, targetOrganizationId, taskId } = targetIds;

    return {
      id,
      rating,
      comment,
      authorType,
      authorUserId,
      authorOrganizationId,
      targetType,
      targetUserId,
      targetOrganizationId,
      platformId: null,
      taskId,
      status,
      createdAt,
      updatedAt,
    };
  }

  private toPublicUserReview(review: ReceivedReviewRowV1): PublicUserReviewV1 {
    const { authorUser } = review;

    return {
      ...this.toUserTargetReview(review),
      authorUser:
        authorUser === null
          ? null
          : {
              name: authorUser.name,
              profile: authorUser.userProfile,
            },
    };
  }

  private toFullUserOrganization(
    membership: UserMembershipRowV1,
  ): FullUserOrganizationV1 {
    const { role, status, createdAt, organization } = membership;
    const {
      id,
      name,
      avatarUrl,
      description,
      createdAt: organizationCreatedAt,
      _count,
    } = organization;

    return {
      id,
      name,
      avatar: avatarUrl,
      description,
      createdAt: organizationCreatedAt,
      _count: { members: _count.members },
      role,
      status,
      joinedAt: createdAt,
    };
  }

  private toPublicUserOrganization(
    membership: UserMembershipRowV1,
  ): PublicUserOrganizationV1 {
    const { role, status, createdAt, organization } = membership;
    const { id, name, avatarUrl, description, _count } = organization;

    return {
      id,
      name,
      avatar: avatarUrl,
      description,
      role,
      status,
      joinedAt: createdAt,
      // NOTE: `||` is the legacy formatter (`_count?.members || 0`).
      membersCount: _count.members || 0,
    };
  }
}
