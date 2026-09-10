import { Injectable } from '@nestjs/common';
import {
  FullOrganizationMembershipRowV1,
  FullUserRowV1,
  PublicOrganizationMembershipRowV1,
  PublicUserOrganizationV1,
  PublicUserProfileV1,
  PublicUserReviewReceivedV1,
  PublicUserReviewReceivedRowV1,
  PublicUserRowV1,
  TaskParticipationRowV1,
  UserOrganizationV1,
  UserProfileV1,
  UserSearchResultV1,
  UserSearchRowV1,
  UserTaskV1,
} from 'src/user/interfaces/v1/user';

@Injectable()
export class UserDataMapperV1 {
  /**
   * NOTE: `userProfile` and `userReviewsWritten` go out under their legacy response keys
   * `profile` and `reviewsWrittenUser` (develop:src/services/user.service.ts:40-47) — the
   * selects stay on the names of the current schema. See ADR-0007.
   */
  toUserProfile(row: FullUserRowV1): UserProfileV1 {
    const {
      organizations,
      hostProfile,
      taskParticipations,
      userProfile,
      userReviewsWritten,
      ...user
    } = row;

    return {
      ...user,
      profile: userProfile,
      reviewsWrittenUser: userReviewsWritten,
      organizations: this.toOrganizations(organizations),
      tasks: this.mergeTasks(hostProfile?.tasks ?? [], taskParticipations),
    };
  }

  toPublicUserProfile(row: PublicUserRowV1): PublicUserProfileV1 {
    const {
      organizations,
      hostProfile,
      taskParticipations,
      userProfile,
      reviewsReceived,
      ...user
    } = row;

    return {
      ...user,
      profile: userProfile,
      reviewsReceived: this.toPublicReviewsReceived(reviewsReceived),
      organizations: this.toPublicOrganizations(organizations),
      tasks: this.mergeTasks(hostProfile?.tasks ?? [], taskParticipations),
    };
  }

  /**
   * NOTE: port of develop:src/controllers/userProfile.controller.ts:161-165 — the search
   * payload is flattened to `{id, name, avatar}` and a missing profile reads as `null`.
   */
  toUserSearchResults(rows: UserSearchRowV1[]): UserSearchResultV1[] {
    return rows.map((row) => {
      const { id, name, userProfile } = row;

      return { id, name, avatar: userProfile?.avatar ?? null };
    });
  }

  /**
   * NOTE: port of develop:src/helpers/user.mapper.ts:4 — the organization row is spread as it
   * stands, so `createdAt` and `_count` reach the client and there is no `membersCount`.
   * `sanitizeUser` could not remap this shape: `entry.organization` is gone after the spread
   * (develop:src/utils/sanitizeUser.ts:21-22). The response key stays `avatar` while the
   * column is now `Organization.avatarUrl`.
   */
  private toOrganizations(
    memberships: FullOrganizationMembershipRowV1[],
  ): UserOrganizationV1[] {
    return memberships.map((membership) => {
      const { role, status, createdAt, organization } = membership;

      return {
        id: organization.id,
        name: organization.name,
        avatar: organization.avatarUrl,
        description: organization.description,
        createdAt: organization.createdAt,
        _count: organization._count,
        role,
        status,
        joinedAt: createdAt,
      };
    });
  }

  /**
   * NOTE: port of develop:src/utils/sanitizeUser.ts:20-33, which is the only place the public
   * profile touched its memberships — `mapUserOrganizations` was not called there
   * (develop:src/services/user.service.ts:134). Hence the flat `membersCount` and no
   * organization `createdAt`.
   */
  private toPublicOrganizations(
    memberships: PublicOrganizationMembershipRowV1[],
  ): PublicUserOrganizationV1[] {
    return memberships.map((membership) => {
      const { role, status, createdAt, organization } = membership;

      return {
        id: organization.id,
        name: organization.name,
        avatar: organization.avatarUrl,
        description: organization.description,
        role,
        status,
        joinedAt: createdAt,
        membersCount: organization._count.members,
      };
    });
  }

  /** NOTE: the author's profile keeps its legacy key too (user.service.ts:147). */
  private toPublicReviewsReceived(
    reviews: PublicUserReviewReceivedRowV1[],
  ): PublicUserReviewReceivedV1[] {
    return reviews.map((review) => {
      const { authorUser, ...rest } = review;

      if (!authorUser) {
        return { ...rest, authorUser: null };
      }

      const { name, userProfile } = authorUser;

      return { ...rest, authorUser: { name, profile: userProfile } };
    });
  }

  /**
   * NOTE: replaces develop:src/utils/mergeUserTasks.ts, which keyed a Map by `id: number`.
   * Task ids are uuid strings now; hosted tasks still win over joined ones on a collision.
   */
  private mergeTasks(
    hostedTasks: UserTaskV1[],
    participations: TaskParticipationRowV1[],
  ): UserTaskV1[] {
    const tasksById = new Map<string, UserTaskV1>();

    for (const task of hostedTasks) {
      tasksById.set(task.id, task);
    }

    for (const participation of participations) {
      if (!tasksById.has(participation.task.id)) {
        tasksById.set(participation.task.id, participation.task);
      }
    }

    return Array.from(tasksById.values());
  }
}
