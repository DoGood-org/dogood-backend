import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  JoinRequestStatus,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { OrganizationMembershipMapperV2 } from 'src/organization/mappers/v2/organization-membership.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { OrganizationMembershipServiceV2 } from 'src/organization/services/v2/organization-membership.service';

describe('OrganizationMembershipServiceV2', () => {
  const actingUserId = 'acting-user-id';
  const userId = 'user-id';
  const organizationId = 'organization-id';
  const requestId = 'request-id';
  const createdAt = new Date('2026-09-01T10:00:00Z');
  const recordNotFound = new Prisma.PrismaClientKnownRequestError(
    'Record not found',
    { code: 'P2025', clientVersion: 'test' },
  );
  const prisma = {
    organizationInvite: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    organizationJoinRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    userOrganization: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const organizationAccessService = {
    getOrganizationMemberRole: jest.fn(),
    isOrganizationManager: jest.fn(),
  };
  const notificationService = { createNotification: jest.fn() };
  let service: OrganizationMembershipServiceV2;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationMembershipServiceV2,
        OrganizationMembershipMapperV2,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OrganizationAccessService,
          useValue: organizationAccessService,
        },
        { provide: NotificationServiceV2, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(OrganizationMembershipServiceV2);
  });

  describe('inviteOrganizationMember', () => {
    it('should forbid a caller who is not a manager', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.inviteOrganizationMember(organizationId, actingUserId, {
          userId,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should answer an active member with 409', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MEMBER,
      );

      await expect(
        service.inviteOrganizationMember(organizationId, actingUserId, {
          userId,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should create a flat invite and notify the invited user', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        null,
      );
      prisma.organizationInvite.create.mockResolvedValue({
        id: requestId,
        senderOrganizationId: organizationId,
        receiverUserId: userId,
        status: JoinRequestStatus.PENDING,
        createdAt,
        senderOrganization: { name: 'Helpers' },
        receiverUser: { name: 'Ann' },
      });

      await expect(
        service.inviteOrganizationMember(organizationId, actingUserId, {
          userId,
        }),
      ).resolves.toEqual({
        id: requestId,
        organizationId,
        userId,
        status: JoinRequestStatus.PENDING,
        createdAt,
      });
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
        }),
      );
    });
  });

  describe('removeOrganizationMember', () => {
    it('should check the caller, not the member being removed', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.removeOrganizationMember(organizationId, userId, actingUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(
        organizationAccessService.isOrganizationManager,
      ).toHaveBeenCalledWith(actingUserId, organizationId);
    });

    it('should answer a missing member with 404', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.removeOrganizationMember(organizationId, userId, actingUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should never remove an ADMIN, the caller included', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.ADMIN,
        organization: { name: 'Helpers' },
      });

      await expect(
        service.removeOrganizationMember(
          organizationId,
          actingUserId,
          actingUserId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.userOrganization.delete).not.toHaveBeenCalled();
    });

    it('should answer a member deleted concurrently with 404', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MEMBER,
        organization: { name: 'Helpers' },
      });
      prisma.userOrganization.delete.mockRejectedValue(recordNotFound);

      await expect(
        service.removeOrganizationMember(organizationId, userId, actingUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should hard-delete the membership and notify the member', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MODERATOR,
        organization: { name: 'Helpers' },
      });

      await service.removeOrganizationMember(
        organizationId,
        userId,
        actingUserId,
      );

      expect(prisma.userOrganization.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_organizationId: { userId, organizationId } },
        }),
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ORG_MEMBER_REMOVED,
          params: { orgName: 'Helpers' },
        }),
      );
    });
  });

  describe('updateOrganizationMemberRole', () => {
    it('should answer a missing member with 404', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrganizationMemberRole(organizationId, userId, {
          role: OrganizationRole.MODERATOR,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should never change the role of an ADMIN', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.ADMIN,
        organization: { name: 'Helpers' },
      });

      await expect(
        service.updateOrganizationMemberRole(organizationId, userId, {
          role: OrganizationRole.MEMBER,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should answer P2025 with 404, not 500', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MEMBER,
        organization: { name: 'Helpers' },
      });
      prisma.userOrganization.update.mockRejectedValue(recordNotFound);

      await expect(
        service.updateOrganizationMemberRole(organizationId, userId, {
          role: OrganizationRole.MODERATOR,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should update the role and notify the member', async () => {
      const updated = {
        userId,
        organizationId,
        role: OrganizationRole.MODERATOR,
      };

      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MEMBER,
        organization: { name: 'Helpers' },
      });
      prisma.userOrganization.update.mockResolvedValue(updated);

      await expect(
        service.updateOrganizationMemberRole(organizationId, userId, {
          role: OrganizationRole.MODERATOR,
        }),
      ).resolves.toEqual(updated);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          params: { orgName: 'Helpers', role: OrganizationRole.MODERATOR },
        }),
      );
    });
  });

  describe('createOrganizationJoinRequest', () => {
    it('should answer a pending duplicate with 409', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue({
        id: requestId,
      });

      await expect(
        service.createOrganizationJoinRequest(organizationId, userId),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should create the request and notify the staff', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);
      prisma.organizationJoinRequest.create.mockResolvedValue({
        id: requestId,
        senderId: userId,
        receiverOrganizationId: organizationId,
        status: JoinRequestStatus.PENDING,
        createdAt,
        sender: { name: 'Ann' },
        receiverOrganization: { name: 'Helpers' },
      });
      prisma.userOrganization.findMany.mockResolvedValue([
        { userId: 'admin-id' },
      ]);

      await expect(
        service.createOrganizationJoinRequest(organizationId, userId),
      ).resolves.toEqual({
        id: requestId,
        organizationId,
        userId,
        status: JoinRequestStatus.PENDING,
        createdAt,
      });
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-id',
          params: { userName: 'Ann', orgName: 'Helpers' },
        }),
      );
    });
  });

  describe('updateOrganizationJoinRequestStatus', () => {
    const pendingJoinRequest = {
      senderId: userId,
      receiverOrganization: { name: 'Helpers' },
    };

    it('should answer a missing or processed request with 404', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          actingUserId,
          { status: JoinRequestStatus.ACCEPTED },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should let only the sender cancel the request', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        pendingJoinRequest,
      );

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          actingUserId,
          { status: JoinRequestStatus.CANCELLED },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should let the sender cancel without membership or notification', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        pendingJoinRequest,
      );
      prisma.organizationJoinRequest.update.mockResolvedValue({
        id: requestId,
        status: JoinRequestStatus.CANCELLED,
      });

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          userId,
          { status: JoinRequestStatus.CANCELLED },
        ),
      ).resolves.toEqual({
        id: requestId,
        status: JoinRequestStatus.CANCELLED,
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should forbid a non-manager to accept', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        pendingJoinRequest,
      );
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          actingUserId,
          { status: JoinRequestStatus.ACCEPTED },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should accept in one transaction with a membership upsert', async () => {
      const updated = { id: requestId, status: JoinRequestStatus.ACCEPTED };

      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        pendingJoinRequest,
      );
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.$transaction.mockResolvedValue([updated, { id: 'membership' }]);

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          actingUserId,
          { status: JoinRequestStatus.ACCEPTED },
        ),
      ).resolves.toEqual(updated);
      expect(prisma.userOrganization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            userId,
            organizationId,
            role: OrganizationRole.MEMBER,
            status: MembershipStatus.ACTIVE,
          },
        }),
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_ACCEPTED,
        }),
      );
    });

    it('should answer a request processed concurrently with 404', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        pendingJoinRequest,
      );
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.$transaction.mockRejectedValue(recordNotFound);

      await expect(
        service.updateOrganizationJoinRequestStatus(
          organizationId,
          requestId,
          actingUserId,
          { status: JoinRequestStatus.ACCEPTED },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateOrganizationInviteStatus', () => {
    const pendingInvite = {
      receiverUserId: userId,
      senderOrganizationId: organizationId,
      senderOrganization: { name: 'Helpers' },
    };

    it('should let only the invited user answer the invite', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(pendingInvite);

      await expect(
        service.updateOrganizationInviteStatus(requestId, actingUserId, {
          status: JoinRequestStatus.ACCEPTED,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should let only the inviting organization staff cancel the invite', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(pendingInvite);
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.updateOrganizationInviteStatus(requestId, userId, {
          status: JoinRequestStatus.CANCELLED,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(
        organizationAccessService.isOrganizationManager,
      ).toHaveBeenCalledWith(userId, organizationId);
    });

    it('should notify the invited user on reject', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(pendingInvite);
      prisma.organizationInvite.update.mockResolvedValue({
        id: requestId,
        status: JoinRequestStatus.REJECTED,
      });

      await service.updateOrganizationInviteStatus(requestId, userId, {
        status: JoinRequestStatus.REJECTED,
      });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_REJECTED,
        }),
      );
    });
  });

  describe('getOrganizationJoinRequests', () => {
    it('should forbid a caller who is not a manager', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.getOrganizationJoinRequests(organizationId, actingUserId, {}),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should page pending requests with a unique tiebreaker', async () => {
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.organizationJoinRequest.findMany.mockResolvedValue([]);

      await service.getOrganizationJoinRequests(organizationId, actingUserId, {
        skip: 40,
      });

      expect(prisma.organizationJoinRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 40,
          take: 20,
        }),
      );
    });
  });

  describe('getOrganizationJoinRequest', () => {
    const joinRequestRow = {
      id: requestId,
      receiverOrganizationId: organizationId,
      status: JoinRequestStatus.ACCEPTED,
      createdAt,
      sender: { id: userId, name: 'Ann', userProfile: null },
    };

    it('should answer a missing request with 404', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationJoinRequest(requestId, userId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should show the sender their request in any status', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        joinRequestRow,
      );

      await expect(
        service.getOrganizationJoinRequest(requestId, userId),
      ).resolves.toEqual({
        id: requestId,
        organizationId,
        status: JoinRequestStatus.ACCEPTED,
        createdAt,
        sender: { id: userId, name: 'Ann', avatar: null },
      });
      expect(
        organizationAccessService.isOrganizationManager,
      ).not.toHaveBeenCalled();
    });

    it('should forbid a stranger', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        joinRequestRow,
      );
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.getOrganizationJoinRequest(requestId, actingUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getOrganizationInvite', () => {
    const inviteRow = {
      id: requestId,
      receiverUserId: userId,
      status: JoinRequestStatus.PENDING,
      createdAt,
      senderOrganization: {
        id: organizationId,
        name: 'Helpers',
        avatarUrl: null,
      },
    };

    it('should show the invited user their invite', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(inviteRow);

      await expect(
        service.getOrganizationInvite(requestId, userId),
      ).resolves.toEqual({
        id: requestId,
        userId,
        status: JoinRequestStatus.PENDING,
        createdAt,
        organization: inviteRow.senderOrganization,
      });
    });

    it('should let the inviting organization staff view it', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(inviteRow);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);

      await service.getOrganizationInvite(requestId, actingUserId);

      expect(
        organizationAccessService.isOrganizationManager,
      ).toHaveBeenCalledWith(actingUserId, organizationId);
    });

    it('should forbid a stranger', async () => {
      prisma.organizationInvite.findFirst.mockResolvedValue(inviteRow);
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.getOrganizationInvite(requestId, actingUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
