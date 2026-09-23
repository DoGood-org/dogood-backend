import { Injectable } from '@nestjs/common';
import { SuccessCode } from '@shared/constants/api-codes';
import {
  AdminOrganizationMemberRowV1,
  AdminOrganizationMemberV1,
  AdminOrganizationRowV1,
  AdminOrganizationsResponseV1,
  AdminOrganizationV1,
  OrganizationCreatedRowV1,
  OrganizationCreatedV1,
  OrganizationDetailsRowV1,
  OrganizationDetailsV1,
  OrganizationLocationRowV1,
  OrganizationLocationV1,
  OrganizationMemberRowV1,
  OrganizationMemberV1,
  OrganizationReceivedReviewRowV1,
  OrganizationReceivedReviewV1,
  OrganizationResponseV1,
  OrganizationRowV1,
  OrganizationSummaryRowV1,
  OrganizationSummaryV1,
  OrganizationTaskRowV1,
  OrganizationTaskV1,
  OrganizationUpdatedRowV1,
  OrganizationUpdatedV1,
  OrganizationUserRowV1,
  OrganizationUserV1,
  OrganizationV1,
  OrganizationWrittenReviewV1,
} from 'src/organization/interfaces/organization';

@Injectable()
export class OrganizationMapperV1 {
  toOrganizationResponse<T>(
    data: T,
    code: SuccessCode,
    message: string,
  ): OrganizationResponseV1<T> {
    return { status: 'success', code, message, data };
  }

  toOrganization(row: OrganizationRowV1): OrganizationV1 {
    const {
      id,
      name,
      createdAt,
      phoneNumber,
      email,
      description,
      additionalInfo,
      avatarUrl,
      locationId,
    } = row;

    return {
      id,
      name,
      createdAt,
      phoneNumber,
      email,
      description,
      moreInfo: additionalInfo,
      avatar: avatarUrl,
      locationId,
    };
  }

  toOrganizationSummary(row: OrganizationSummaryRowV1): OrganizationSummaryV1 {
    const { id, name, avatarUrl } = row;

    return { id, name, avatar: avatarUrl };
  }

  toCreatedOrganization(row: OrganizationCreatedRowV1): OrganizationCreatedV1 {
    const { location, members } = row;

    return {
      ...this.toOrganization(row),
      location: this.toOrganizationLocation(location),
      members,
    };
  }

  toUpdatedOrganization(row: OrganizationUpdatedRowV1): OrganizationUpdatedV1 {
    return {
      ...this.toOrganization(row),
      location: this.toOrganizationLocation(row.location),
    };
  }

  toOrganizationDetails(row: OrganizationDetailsRowV1): OrganizationDetailsV1 {
    const {
      location,
      hostProfile,
      members,
      reviewsReceived,
      userReviewsWritten,
      orgReviewsWritten,
      taskReviewsWritten,
      systemReviewsWritten,
    } = row;
    const emptyTargets = {
      targetUserId: null,
      targetOrganizationId: null,
      taskId: null,
      targetUser: null,
      targetOrganization: null,
      task: null,
    };
    const reviewsWrittenOrg: OrganizationWrittenReviewV1[] = [
      ...userReviewsWritten.map(({ targetUserId, targetUser, ...review }) => ({
        ...review,
        ...emptyTargets,
        targetUserId,
        targetUser: this.toOrganizationUser(targetUser),
      })),
      ...orgReviewsWritten.map(
        ({ targetOrganizationId, targetOrganization, ...review }) => ({
          ...review,
          ...emptyTargets,
          targetOrganizationId,
          targetOrganization: this.toOrganization(targetOrganization),
        }),
      ),
      ...taskReviewsWritten.map(({ taskId, task, ...review }) => ({
        ...review,
        ...emptyTargets,
        taskId,
        task: this.toOrganizationTask(task),
      })),
      ...systemReviewsWritten.map((review) => ({
        ...review,
        ...emptyTargets,
      })),
    ];

    return {
      ...this.toOrganization(row),
      location: this.toOrganizationLocation(location),
      members: members.map((member) => this.toOrganizationMember(member)),
      reviews: reviewsReceived.map((review) => this.toReceivedReview(review)),
      reviewsWrittenOrg,
      hostId: hostProfile?.id,
      tasks: (hostProfile?.tasks ?? []).map(({ reviews, ...task }) => ({
        ...this.toOrganizationTask(task),
        reviews,
      })),
    };
  }

  toOrganizationMember(row: OrganizationMemberRowV1): OrganizationMemberV1 {
    const { id, role, status, userId, organizationId, user } = row;

    return {
      id,
      role,
      status,
      userId,
      organizationId,
      user: this.toOrganizationUser(user),
    };
  }

  toAdminOrganizationsResponse(
    rows: AdminOrganizationRowV1[],
    total: number,
    page: number,
    limit: number,
  ): AdminOrganizationsResponseV1 {
    const totalPages = Math.ceil(total / limit);

    return {
      ...this.toOrganizationResponse(
        rows.map((row) => this.toAdminOrganization(row)),
        SuccessCode.ORGANIZATION_DATA_RETRIEVED,
        'Organizations retrieved successfully',
      ),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private toAdminOrganization(
    row: AdminOrganizationRowV1,
  ): AdminOrganizationV1 {
    const { stripeCustomerId, location, members } = row;

    return {
      ...this.toOrganization(row),
      stripeCustomerId,
      location: this.toOrganizationLocation(location),
      members: members.map((member) => this.toAdminOrganizationMember(member)),
    };
  }

  private toAdminOrganizationMember(
    row: AdminOrganizationMemberRowV1,
  ): AdminOrganizationMemberV1 {
    const { id, userId, organizationId, role, status, createdAt, user } = row;

    return {
      id,
      userId,
      organizationId,
      role,
      status,
      createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        siteRole: user.role,
        profile: user.userProfile,
      },
    };
  }

  // NOTE: the current Location stores '' where legacy stored NULL.
  private toOrganizationLocation(
    row: OrganizationLocationRowV1 | null,
  ): OrganizationLocationV1 | null {
    if (row === null) {
      return null;
    }

    const { id, country, region, city } = row;

    return {
      id,
      country: country || null,
      region: region || null,
      city: city || null,
    };
  }

  toOrganizationUser(row: OrganizationUserRowV1): OrganizationUserV1 {
    const { id, name, userProfile } = row;

    return { id, name, profile: userProfile };
  }

  private toOrganizationTask(row: OrganizationTaskRowV1): OrganizationTaskV1 {
    const { imageUrl, taskLocation, ...task } = row;

    return {
      ...task,
      picture: imageUrl,
      locationName: taskLocation?.name ?? null,
    };
  }

  private toReceivedReview(
    row: OrganizationReceivedReviewRowV1,
  ): OrganizationReceivedReviewV1 {
    const { targetOrganizationId, authorUser, authorOrganization, ...review } =
      row;

    return {
      ...review,
      targetOrganizationId,
      authorUser: authorUser && this.toOrganizationUser(authorUser),
      authorOrganization:
        authorOrganization && this.toOrganization(authorOrganization),
    };
  }
}
