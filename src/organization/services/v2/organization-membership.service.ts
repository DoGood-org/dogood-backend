import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityType,
  JoinRequestStatus,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import {
  InviteOrganizationMemberDataV2,
  MembershipRequestStatusV2,
  OrganizationInviteDetailsV2,
  OrganizationInviteV2,
  OrganizationJoinRequestDetailsV2,
  OrganizationJoinRequestV2,
  OrganizationMemberRoleV2,
  OrganizationMembershipTarget,
  OrganizationPageParamsV2,
  UpdateMembershipRequestStatusDataV2,
  UpdateOrganizationMemberRoleDataV2,
} from 'src/organization/interfaces/organization';
import { OrganizationMembershipMapperV2 } from 'src/organization/mappers/v2/organization-membership.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

const MEMBER_NOT_FOUND_MESSAGE = 'Member not found';
const PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE = 'Pending join request not found';
const PENDING_INVITE_NOT_FOUND_MESSAGE = 'Pending invite not found';

const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2025';

@Injectable()
export class OrganizationMembershipServiceV2 {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly notificationService: NotificationServiceV2,
    private readonly membershipMapper: OrganizationMembershipMapperV2,
  ) {}

  async inviteOrganizationMember(
    organizationId: string,
    actingUserId: string,
    data: InviteOrganizationMemberDataV2,
  ): Promise<OrganizationInviteV2> {
    const { userId } = data;

    await this.assertOrganizationManager(
      actingUserId,
      organizationId,
      'Only ADMIN or MODERATOR can invite members',
    );

    const inviteeRole =
      await this.organizationAccessService.getOrganizationMemberRole(
        userId,
        organizationId,
      );

    if (inviteeRole !== null) {
      throw new ConflictException('User is already an active member');
    }

    const invite = await this.prisma.organizationInvite.create({
      data: { senderOrganizationId: organizationId, receiverUserId: userId },
      select: {
        id: true,
        senderOrganizationId: true,
        receiverUserId: true,
        status: true,
        createdAt: true,
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

    return this.membershipMapper.toOrganizationInvite(invite);
  }

  async removeOrganizationMember(
    organizationId: string,
    userId: string,
    actingUserId: string,
  ): Promise<void> {
    await this.assertOrganizationManager(
      actingUserId,
      organizationId,
      'Only ADMIN or MODERATOR can remove members',
    );

    const member = await this.prisma.userOrganization.findFirst({
      where: { userId, organizationId, deletedAt: null },
      select: { role: true, organization: { select: { name: true } } },
    });

    if (!member) {
      throw new NotFoundException(MEMBER_NOT_FOUND_MESSAGE);
    }

    if (member.role === OrganizationRole.ADMIN) {
      throw new ForbiddenException(
        'ADMIN cannot be removed from the organization',
      );
    }

    // NOTE: hard delete — a soft-deleted pair would hand the old role back when the user rejoins.
    try {
      await this.prisma.userOrganization.delete({
        where: { userId_organizationId: { userId, organizationId } },
        select: { id: true },
      });
    } catch (error) {
      this.rethrowRecordNotFound(error, MEMBER_NOT_FOUND_MESSAGE);
    }

    await this.notificationService.createNotification({
      userId,
      type: NotificationType.ORG_MEMBER_REMOVED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: { orgName: member.organization.name },
    });
  }

  async updateOrganizationMemberRole(
    organizationId: string,
    userId: string,
    data: UpdateOrganizationMemberRoleDataV2,
  ): Promise<OrganizationMemberRoleV2> {
    const { role } = data;
    const member = await this.prisma.userOrganization.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
      },
      select: { role: true, organization: { select: { name: true } } },
    });

    if (!member) {
      throw new NotFoundException(MEMBER_NOT_FOUND_MESSAGE);
    }

    if (member.role === OrganizationRole.ADMIN) {
      throw new ForbiddenException('ADMIN role cannot be changed');
    }

    let updatedMember: OrganizationMemberRoleV2;

    try {
      updatedMember = await this.prisma.userOrganization.update({
        where: { userId_organizationId: { userId, organizationId } },
        data: { role },
        select: { userId: true, organizationId: true, role: true },
      });
    } catch (error) {
      this.rethrowRecordNotFound(error, MEMBER_NOT_FOUND_MESSAGE);
    }

    await this.notificationService.createNotification({
      userId,
      type: NotificationType.ORG_ROLE_UPDATED,
      relatedId: organizationId,
      entityType: EntityType.ORGANIZATION,
      params: { orgName: member.organization.name, role },
    });

    return updatedMember;
  }

  async createOrganizationJoinRequest(
    organizationId: string,
    senderId: string,
  ): Promise<OrganizationJoinRequestV2> {
    // NOTE: ponytail — no unique index behind this check, so two concurrent requests can both pass it;
    // add a partial unique index on (senderId, receiverOrganizationId) WHERE status = 'PENDING' if duplicates show up.
    const existingJoinRequest =
      await this.prisma.organizationJoinRequest.findFirst({
        where: {
          senderId,
          receiverOrganizationId: organizationId,
          status: JoinRequestStatus.PENDING,
          deletedAt: null,
        },
        select: { id: true },
      });

    if (existingJoinRequest) {
      throw new ConflictException('A pending join request already exists');
    }

    const joinRequest = await this.prisma.organizationJoinRequest.create({
      data: { senderId, receiverOrganizationId: organizationId },
      select: {
        id: true,
        senderId: true,
        receiverOrganizationId: true,
        status: true,
        createdAt: true,
        sender: { select: { name: true } },
        receiverOrganization: { select: { name: true } },
      },
    });
    const staffMembers = await this.prisma.userOrganization.findMany({
      where: {
        organizationId,
        role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
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
          relatedId: organizationId,
          entityType: EntityType.ORGANIZATION,
          params: {
            userName: joinRequest.sender.name,
            orgName: joinRequest.receiverOrganization.name,
          },
        }),
      ),
    );

    return this.membershipMapper.toOrganizationJoinRequest(joinRequest);
  }

  async updateOrganizationJoinRequestStatus(
    organizationId: string,
    requestId: string,
    actingUserId: string,
    data: UpdateMembershipRequestStatusDataV2,
  ): Promise<MembershipRequestStatusV2> {
    const { status } = data;
    const pendingWhere = {
      id: requestId,
      receiverOrganizationId: organizationId,
      status: JoinRequestStatus.PENDING,
      deletedAt: null,
    };
    const joinRequest = await this.prisma.organizationJoinRequest.findFirst({
      where: pendingWhere,
      select: {
        senderId: true,
        receiverOrganization: { select: { name: true } },
      },
    });

    if (!joinRequest) {
      throw new NotFoundException(PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE);
    }

    const { senderId, receiverOrganization } = joinRequest;

    if (status === JoinRequestStatus.CANCELLED) {
      this.assertAllowed(
        senderId === actingUserId,
        'Only the sender can cancel this join request',
      );
    } else {
      await this.assertOrganizationManager(
        actingUserId,
        organizationId,
        'Only organization staff can handle this join request',
      );
    }

    const target: OrganizationMembershipTarget = {
      userId: senderId,
      organizationId,
      organizationName: receiverOrganization.name,
    };
    const result = await this.commitRequestStatus(
      this.prisma.organizationJoinRequest.update({
        where: pendingWhere,
        data: { status },
        select: { id: true, status: true },
      }),
      status,
      target,
      PENDING_JOIN_REQUEST_NOT_FOUND_MESSAGE,
    );

    await this.notifyRequestStatus(status, target);

    return result;
  }

  async updateOrganizationInviteStatus(
    inviteId: string,
    actingUserId: string,
    data: UpdateMembershipRequestStatusDataV2,
  ): Promise<MembershipRequestStatusV2> {
    const { status } = data;
    const pendingWhere = {
      id: inviteId,
      status: JoinRequestStatus.PENDING,
      deletedAt: null,
    };
    const invite = await this.prisma.organizationInvite.findFirst({
      where: pendingWhere,
      select: {
        receiverUserId: true,
        senderOrganizationId: true,
        senderOrganization: { select: { name: true } },
      },
    });

    if (!invite) {
      throw new NotFoundException(PENDING_INVITE_NOT_FOUND_MESSAGE);
    }

    const { receiverUserId, senderOrganizationId, senderOrganization } = invite;

    if (status === JoinRequestStatus.CANCELLED) {
      await this.assertOrganizationManager(
        actingUserId,
        senderOrganizationId,
        'Only organization staff can cancel this invite',
      );
    } else {
      this.assertAllowed(
        receiverUserId === actingUserId,
        'Only the invited user can answer this invite',
      );
    }

    const target: OrganizationMembershipTarget = {
      userId: receiverUserId,
      organizationId: senderOrganizationId,
      organizationName: senderOrganization.name,
    };
    const result = await this.commitRequestStatus(
      this.prisma.organizationInvite.update({
        where: pendingWhere,
        data: { status },
        select: { id: true, status: true },
      }),
      status,
      target,
      PENDING_INVITE_NOT_FOUND_MESSAGE,
    );

    await this.notifyRequestStatus(status, target);

    return result;
  }

  async getOrganizationJoinRequests(
    organizationId: string,
    actingUserId: string,
    params: OrganizationPageParamsV2,
  ): Promise<OrganizationJoinRequestDetailsV2[]> {
    const { skip = 0, limit = 20 } = params;

    await this.assertOrganizationManager(
      actingUserId,
      organizationId,
      'Only organization staff can view join requests',
    );

    const joinRequests = await this.prisma.organizationJoinRequest.findMany({
      where: {
        receiverOrganizationId: organizationId,
        status: JoinRequestStatus.PENDING,
        deletedAt: null,
      },
      orderBy: [
        { createdAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.asc },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        receiverOrganizationId: true,
        status: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
      },
    });

    return joinRequests.map((joinRequest) =>
      this.membershipMapper.toOrganizationJoinRequestDetails(joinRequest),
    );
  }

  async getOrganizationJoinRequest(
    requestId: string,
    actingUserId: string,
  ): Promise<OrganizationJoinRequestDetailsV2> {
    const joinRequest = await this.prisma.organizationJoinRequest.findFirst({
      where: { id: requestId, deletedAt: null },
      select: {
        id: true,
        receiverOrganizationId: true,
        status: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            userProfile: { select: { avatar: true } },
          },
        },
      },
    });

    if (!joinRequest) {
      throw new NotFoundException('Join request not found');
    }

    if (joinRequest.sender.id !== actingUserId) {
      await this.assertOrganizationManager(
        actingUserId,
        joinRequest.receiverOrganizationId,
        'Only organization staff or the sender can view this join request',
      );
    }

    return this.membershipMapper.toOrganizationJoinRequestDetails(joinRequest);
  }

  async getOrganizationInvite(
    inviteId: string,
    actingUserId: string,
  ): Promise<OrganizationInviteDetailsV2> {
    const invite = await this.prisma.organizationInvite.findFirst({
      where: { id: inviteId, deletedAt: null },
      select: {
        id: true,
        receiverUserId: true,
        status: true,
        createdAt: true,
        senderOrganization: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.receiverUserId !== actingUserId) {
      await this.assertOrganizationManager(
        actingUserId,
        invite.senderOrganization.id,
        'Only the invited user or organization staff can view this invite',
      );
    }

    return this.membershipMapper.toOrganizationInviteDetails(invite);
  }

  private async assertOrganizationManager(
    actingUserId: string,
    organizationId: string,
    message: string,
  ): Promise<void> {
    const isManager =
      await this.organizationAccessService.isOrganizationManager(
        actingUserId,
        organizationId,
      );

    this.assertAllowed(isManager, message);
  }

  private assertAllowed(isAllowed: boolean, message: string): void {
    if (!isAllowed) {
      throw new ForbiddenException(message);
    }
  }

  private async commitRequestStatus<T>(
    statusUpdate: Prisma.PrismaPromise<T>,
    status: JoinRequestStatus,
    target: OrganizationMembershipTarget,
    notFoundMessage: string,
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
      this.rethrowRecordNotFound(error, notFoundMessage);
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

  private rethrowRecordNotFound(error: unknown, message: string): never {
    if (isRecordNotFoundError(error)) {
      throw new NotFoundException(message);
    }

    throw error;
  }
}
