import { HttpStatus, Injectable } from '@nestjs/common';
import {
  EntityType,
  JoinRequestStatus,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import {
  ASSIGNABLE_ORGANIZATION_ROLES,
  CreateJoinRequestDataV1,
  InviteOrganizationMemberDataV1,
  JoinRequestByIdResponseV1,
  JoinRequestDirectionV1,
  OrganizationInviteCreatedV1,
  OrganizationInviteV1,
  OrganizationJoinRequestCreatedV1,
  OrganizationJoinRequestListItemV1,
  OrganizationJoinRequestV1,
  OrganizationMemberRoleUpdatedV1,
  OrganizationMembershipTarget,
  OrganizationResponseV1,
  OrganizationResponseWithoutDataV1,
  UpdateJoinRequestStatusDataV1,
  UpdateOrganizationMemberRoleDataV1,
} from 'src/organization/interfaces/organization';
import { OrganizationMembershipMapperV1 } from 'src/organization/mappers/v1/organization-membership.mapper';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

const MANAGER_ROLES: OrganizationRole[] = [
  OrganizationRole.ADMIN,
  OrganizationRole.MODERATOR,
];
const ADMIN_ROLES: OrganizationRole[] = [OrganizationRole.ADMIN];
const PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE = 'Pending join request not found';

// NOTE: legacy `httpError` without a third argument answers with no machine-readable code.
const codelessV1Exception = (
  statusCode: HttpStatus,
  message: string,
): V1ApiException =>
  new V1ApiException(statusCode, message, ErrorCode.JOIN_REQUEST_NOT_FOUND, {
    status: 'error',
    statusCode,
    code: null,
    message,
  });

const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2025';

@Injectable()
export class OrganizationMembershipServiceV1 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly notificationService: NotificationServiceV2,
    private readonly organizationMapper: OrganizationMapperV1,
    private readonly membershipMapper: OrganizationMembershipMapperV1,
  ) {}

  async inviteOrganizationMember(
    data: InviteOrganizationMemberDataV1,
    actingUserId: string,
  ): Promise<OrganizationResponseV1<{ invite: OrganizationInviteCreatedV1 }>> {
    const { userId, organizationId } = data;

    await this.assertActingMemberRole(
      actingUserId,
      organizationId,
      MANAGER_ROLES,
      'Only ADMIN or MODERATOR can invite members',
    );

    // NOTE: legacy let the foreign key fail as a 500 for an unknown user (SEC-B-17).
    const invitee = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });

    if (!invitee) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    // NOTE: legacy threw 404 here for a user who is not a member yet, so no invite could ever be sent;
    // only an active member is a conflict now (human's decision on defect #1).
    const inviteeRole =
      await this.organizationAccessService.getOrganizationMemberRole(
        userId,
        organizationId,
      );

    if (inviteeRole !== null) {
      throw new V1ApiException(
        HttpStatus.CONFLICT,
        'User is already a member',
        ErrorCode.USER_ALREADY_MEMBER,
      );
    }

    const invite = await this.prisma.organizationInvite.create({
      data: { senderOrganizationId: organizationId, receiverUserId: userId },
      select: {
        id: true,
        senderOrganizationId: true,
        receiverUserId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        senderOrganization: { select: { name: true } },
        receiverUser: { select: { name: true } },
      },
    });

    await this.notificationService.createNotification({
      userId,
      type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: {
        orgName: invite.senderOrganization.name,
        userName: invite.receiverUser.name,
      },
    });

    return this.organizationMapper.toOrganizationResponse(
      { invite },
      SuccessCode.JOIN_REQUEST_CREATED,
      'Invitation has been sent to the user',
    );
  }

  async removeOrganizationMember(
    userId: unknown,
    organizationId: unknown,
    actingUserId: string,
  ): Promise<OrganizationResponseWithoutDataV1> {
    if (
      typeof userId !== 'string' ||
      typeof organizationId !== 'string' ||
      !userId ||
      !organizationId
    ) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'userId and organizationId are required',
        ErrorCode.USER_ID_OR_ORGANIZATION_ID_INVALID,
      );
    }

    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { name: true },
    });

    if (!organization) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Organization not found',
        ErrorCode.ORGANIZATION_NOT_FOUND,
      );
    }

    // NOTE: legacy checked the role of the member being removed, not the caller (defect #2).
    await this.assertActingMemberRole(
      actingUserId,
      organizationId,
      MANAGER_ROLES,
      'Only ADMIN or MODERATOR can delete the other member',
    );

    const member = await this.prisma.userOrganization.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true },
    });

    if (!member) {
      throw this.memberNotFoundException();
    }

    if (member.role === OrganizationRole.ADMIN) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'ADMIN cannot be removed from the organization',
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION,
      );
    }

    try {
      await this.prisma.userOrganization.delete({
        where: { userId_organizationId: { userId, organizationId } },
        select: { id: true },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw this.memberNotFoundException();
      }

      throw error;
    }

    await this.notificationService.createNotification({
      userId,
      type: NotificationType.ORG_MEMBER_REMOVED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: { orgName: organization.name },
    });

    return this.membershipMapper.toResponseWithoutData(
      SuccessCode.MEMBER_REMOVED_FROM_ORGANIZATION,
      'Member removed from organization',
    );
  }

  async updateOrganizationMemberRole(
    data: UpdateOrganizationMemberRoleDataV1,
    actingUserId: string,
  ): Promise<
    OrganizationResponseV1<{ result: OrganizationMemberRoleUpdatedV1 }>
  > {
    const { organizationId, userId, role } = data;

    await this.assertActingMemberRole(
      actingUserId,
      organizationId,
      ADMIN_ROLES,
      'Only ADMIN can update member roles',
    );

    const newRole = ASSIGNABLE_ORGANIZATION_ROLES.find(
      (assignableRole) => assignableRole === role,
    );

    if (!newRole) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Invalid role provided',
        ErrorCode.MEMBER_ROLE_INVALID,
      );
    }

    const member = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      select: { role: true },
    });

    if (!member) {
      throw this.memberNotFoundException();
    }

    // NOTE: legacy let an ADMIN demote any ADMIN, itself included (defect #6).
    if (member.role === OrganizationRole.ADMIN) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'ADMIN role cannot be changed',
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION,
      );
    }

    let result: OrganizationMemberRoleUpdatedV1;

    try {
      result = await this.prisma.userOrganization.update({
        where: { userId_organizationId: { userId, organizationId } },
        data: { role: newRole },
        select: {
          id: true,
          userId: true,
          organizationId: true,
          role: true,
          status: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
      });
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw this.memberNotFoundException();
      }

      throw error;
    }

    await this.notificationService.createNotification({
      userId,
      type: NotificationType.ORG_ROLE_UPDATED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: { orgName: result.organization.name, role: newRole },
    });

    return this.organizationMapper.toOrganizationResponse(
      { result },
      SuccessCode.MEMBER_ROLE_UPDATED,
      'User role was updated successfully',
    );
  }

  async createJoinRequest(
    data: CreateJoinRequestDataV1,
    senderId: string,
  ): Promise<
    OrganizationResponseV1<{ joinRequest: OrganizationJoinRequestCreatedV1 }>
  > {
    const { receiverOrganizationId, direction } = data;

    // NOTE: the legacy body cannot carry the sending organization, so this branch never produced a valid
    // invite; invites go through POST /members (human's decision on defect #3).
    if (direction === JoinRequestDirectionV1.FROM_ORGANIZATION) {
      throw codelessV1Exception(
        HttpStatus.BAD_REQUEST,
        'Organizations invite users through POST /organization/members',
      );
    }

    if (!receiverOrganizationId) {
      throw codelessV1Exception(
        HttpStatus.BAD_REQUEST,
        'receiverOrganizationId is required',
      );
    }

    // NOTE: legacy let the foreign key fail as a 500 for an unknown organization (SEC-B-17).
    const receiverOrganization = await this.prisma.organization.findFirst({
      where: { id: receiverOrganizationId, deletedAt: null },
      select: { id: true },
    });

    if (!receiverOrganization) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'Organization not found',
        ErrorCode.ORGANIZATION_NOT_FOUND,
      );
    }

    // NOTE: ponytail — no unique index behind this check, so two concurrent requests can both pass it;
    // add a partial unique index on (senderId, receiverOrganizationId) WHERE status = 'PENDING' if duplicates show up.
    const existingJoinRequest =
      await this.prisma.organizationJoinRequest.findFirst({
        where: {
          senderId,
          receiverOrganizationId,
          status: JoinRequestStatus.PENDING,
          deletedAt: null,
        },
        select: { id: true },
      });

    if (existingJoinRequest) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Join request already exists',
        ErrorCode.JOIN_REQUEST_ALREADY_EXISTS,
      );
    }

    const joinRequest = await this.prisma.organizationJoinRequest.create({
      data: { senderId, receiverOrganizationId },
      select: {
        id: true,
        senderId: true,
        receiverOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sender: { select: { name: true } },
        receiverOrganization: { select: { name: true } },
      },
    });
    const staffMembers = await this.prisma.userOrganization.findMany({
      where: {
        organizationId: receiverOrganizationId,
        role: { in: MANAGER_ROLES },
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      select: { userId: true },
    });

    await Promise.all(
      staffMembers.map((staffMember) =>
        this.notificationService.createNotification({
          userId: staffMember.userId,
          type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
          relatedId: receiverOrganizationId,
          entityType: EntityType.ORGANIZATION,
          params: {
            userName: joinRequest.sender.name,
            orgName: joinRequest.receiverOrganization.name,
          },
        }),
      ),
    );

    return this.organizationMapper.toOrganizationResponse(
      { joinRequest },
      SuccessCode.JOIN_REQUEST_CREATED,
      'New join request was created',
    );
  }

  async updateJoinRequestStatus(
    data: UpdateJoinRequestStatusDataV1,
    actingUserId: string,
  ): Promise<
    OrganizationResponseV1<{
      result: OrganizationJoinRequestV1 | OrganizationInviteV1;
    }>
  > {
    const { id, status } = data;
    const pendingWhere = {
      id,
      status: JoinRequestStatus.PENDING,
      deletedAt: null,
    };
    const [joinRequest, invite] = await Promise.all([
      this.prisma.organizationJoinRequest.findFirst({
        where: pendingWhere,
        select: {
          senderId: true,
          receiverOrganizationId: true,
          receiverOrganization: { select: { name: true } },
        },
      }),
      this.prisma.organizationInvite.findFirst({
        where: pendingWhere,
        select: {
          receiverUserId: true,
          senderOrganizationId: true,
          senderOrganization: { select: { name: true } },
        },
      }),
    ]);
    let result: OrganizationJoinRequestV1 | OrganizationInviteV1;
    let target: OrganizationMembershipTarget;

    if (joinRequest) {
      const { senderId, receiverOrganizationId, receiverOrganization } =
        joinRequest;
      // NOTE: legacy let organization staff cancel a user's request; only its sender may now (defect #5).
      let isAllowed = senderId === actingUserId;

      if (status !== JoinRequestStatus.CANCELLED) {
        isAllowed = await this.organizationAccessService.isOrganizationManager(
          actingUserId,
          receiverOrganizationId,
        );
      }

      this.assertAllowed(
        isAllowed,
        'Only organization staff or the sender can handle this request',
      );
      target = {
        userId: senderId,
        organizationId: receiverOrganizationId,
        organizationName: receiverOrganization.name,
      };
      result = await this.commitRequestStatus(
        this.prisma.organizationJoinRequest.update({
          where: pendingWhere,
          data: { status },
          select: {
            id: true,
            senderId: true,
            receiverOrganizationId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        status,
        target,
      );
    } else if (invite) {
      const { receiverUserId, senderOrganizationId, senderOrganization } =
        invite;
      // NOTE: an invite has no sending user in the current schema, so its organization's staff cancel it.
      let isAllowed = receiverUserId === actingUserId;

      if (status === JoinRequestStatus.CANCELLED) {
        isAllowed = await this.organizationAccessService.isOrganizationManager(
          actingUserId,
          senderOrganizationId,
        );
      }

      this.assertAllowed(
        isAllowed,
        'Only the invited user or organization staff can handle this invitation',
      );
      target = {
        userId: receiverUserId,
        organizationId: senderOrganizationId,
        organizationName: senderOrganization.name,
      };
      result = await this.commitRequestStatus(
        this.prisma.organizationInvite.update({
          where: pendingWhere,
          data: { status },
          select: {
            id: true,
            senderOrganizationId: true,
            receiverUserId: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        status,
        target,
      );
    } else {
      throw codelessV1Exception(
        HttpStatus.NOT_FOUND,
        PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE,
      );
    }

    await this.notifyRequestStatus(status, target);

    return this.organizationMapper.toOrganizationResponse(
      { result },
      SuccessCode.JOIN_REQUEST_STATUS_UPDATED,
      'Join request was updated successfully',
    );
  }

  async getOrganizationJoinRequests(
    organizationId: string,
    actingUserId: string,
  ): Promise<
    OrganizationResponseV1<{
      joinRequests: OrganizationJoinRequestListItemV1[];
    }>
  > {
    await this.assertActingMemberRole(
      actingUserId,
      organizationId,
      MANAGER_ROLES,
      'Only organization staff can view join requests',
    );

    const joinRequests = await this.prisma.organizationJoinRequest.findMany({
      where: {
        receiverOrganizationId: organizationId,
        status: JoinRequestStatus.PENDING,
        deletedAt: null,
      },
      orderBy: { createdAt: Prisma.SortOrder.desc },
      select: {
        id: true,
        senderId: true,
        receiverOrganizationId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        sender: {
          select: {
            id: true,
            userProfile: {
              select: {
                id: true,
                userId: true,
                bio: true,
                avatar: true,
                gender: true,
                birthDate: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    return this.organizationMapper.toOrganizationResponse(
      {
        joinRequests: joinRequests.map((joinRequest) =>
          this.membershipMapper.toJoinRequestListItem(joinRequest),
        ),
      },
      SuccessCode.JOIN_REQUESTS_RETRIEVED,
      'Join requests retrieved successfully',
    );
  }

  async getJoinRequestById(
    id: string,
    actingUserId: string,
  ): Promise<JoinRequestByIdResponseV1> {
    const [joinRequest, invite] = await Promise.all([
      this.prisma.organizationJoinRequest.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          senderId: true,
          receiverOrganizationId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          sender: {
            select: {
              id: true,
              name: true,
              userProfile: { select: { avatar: true } },
            },
          },
          receiverOrganization: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              phoneNumber: true,
              email: true,
              description: true,
              additionalInfo: true,
              avatarUrl: true,
              locationId: true,
            },
          },
        },
      }),
      this.prisma.organizationInvite.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          senderOrganizationId: true,
          receiverUserId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          senderOrganization: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              phoneNumber: true,
              email: true,
              description: true,
              additionalInfo: true,
              avatarUrl: true,
              locationId: true,
            },
          },
        },
      }),
    ]);

    if (joinRequest) {
      this.assertJoinRequestPending(joinRequest.status);

      // NOTE: legacy looked up the sender's membership before this check and answered 404 to a sender
      // outside the organization; the sender now sees their own request (human's decision, fork 2).
      if (joinRequest.senderId !== actingUserId) {
        await this.assertActingMemberRole(
          actingUserId,
          joinRequest.receiverOrganizationId,
          MANAGER_ROLES,
          'You do not have permission to view this request',
        );
      }

      return this.membershipMapper.toJoinRequestByIdResponse(
        this.membershipMapper.toJoinRequestDetails(joinRequest),
      );
    }

    if (invite) {
      this.assertJoinRequestPending(invite.status);

      // NOTE: legacy never let the invited user see their own invite (defect #4).
      const isAllowed =
        invite.receiverUserId === actingUserId ||
        (await this.organizationAccessService.isOrganizationManager(
          actingUserId,
          invite.senderOrganizationId,
        ));

      this.assertAllowed(
        isAllowed,
        'You do not have permission to view this request',
      );

      return this.membershipMapper.toJoinRequestByIdResponse(
        this.membershipMapper.toInviteDetails(invite),
      );
    }

    throw new V1ApiException(
      HttpStatus.NOT_FOUND,
      'Join request not found',
      ErrorCode.JOIN_REQUEST_NOT_FOUND,
    );
  }

  // NOTE: legacy `isMemberInOrganization` throws 404 for a non-member before any role check.
  private async assertActingMemberRole(
    actingUserId: string,
    organizationId: string,
    allowedRoles: OrganizationRole[],
    forbiddenMessage: string,
  ): Promise<void> {
    const role = await this.organizationAccessService.getOrganizationMemberRole(
      actingUserId,
      organizationId,
    );

    if (role === null) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User is not a member of this organization',
        ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION,
      );
    }

    this.assertAllowed(allowedRoles.includes(role), forbiddenMessage);
  }

  private assertAllowed(isAllowed: boolean, message: string): void {
    if (!isAllowed) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        message,
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION,
      );
    }
  }

  private assertJoinRequestPending(status: JoinRequestStatus): void {
    if (status !== JoinRequestStatus.PENDING) {
      throw new V1ApiException(
        HttpStatus.BAD_REQUEST,
        'Join request already processed',
        ErrorCode.JOIN_REQUEST_ALREADY_PROCESSED,
      );
    }
  }

  // NOTE: legacy wrote the status and the membership separately and 500'd on an existing member;
  // both now commit together and the membership is upserted (human's decision on defect #5).
  private async commitRequestStatus<T>(
    statusUpdate: Prisma.PrismaPromise<T>,
    status: JoinRequestStatus,
    target: OrganizationMembershipTarget,
  ): Promise<T> {
    const { userId, organizationId } = target;

    try {
      if (status !== JoinRequestStatus.ACCEPTED) {
        return await statusUpdate;
      }

      const [updated] = await this.prisma.$transaction([
        statusUpdate,
        this.prisma.userOrganization.upsert({
          where: { userId_organizationId: { userId, organizationId } },
          create: {
            userId,
            organizationId,
            role: OrganizationRole.MEMBER,
            status: MembershipStatus.ACTIVE,
          },
          update: { status: MembershipStatus.ACTIVE, deletedAt: null },
          select: { id: true },
        }),
      ]);

      return updated;
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        throw codelessV1Exception(
          HttpStatus.NOT_FOUND,
          PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE,
        );
      }

      throw error;
    }
  }

  private async notifyRequestStatus(
    status: JoinRequestStatus,
    target: OrganizationMembershipTarget,
  ): Promise<void> {
    const { userId, organizationId, organizationName } = target;
    let type: NotificationType;

    switch (status) {
      case JoinRequestStatus.ACCEPTED:
        type = NotificationType.ORG_JOIN_REQUEST_ACCEPTED;
        break;
      case JoinRequestStatus.REJECTED:
        type = NotificationType.ORG_JOIN_REQUEST_REJECTED;
        break;
      case JoinRequestStatus.PENDING:
      case JoinRequestStatus.CANCELLED:
        return;
    }

    await this.notificationService.createNotification({
      userId,
      type,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: { orgName: organizationName },
    });
  }

  private memberNotFoundException(): V1ApiException {
    return new V1ApiException(
      HttpStatus.NOT_FOUND,
      'Member not found in organization',
      ErrorCode.MEMBER_NOT_FOUND,
    );
  }
}
