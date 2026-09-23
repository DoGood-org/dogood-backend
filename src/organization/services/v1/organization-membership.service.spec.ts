import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  JoinRequestStatus,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { NotificationServiceV2 } from 'src/notification/services/v2/notification.service';
import { JoinRequestDirectionV1 } from 'src/organization/interfaces/organization';
import { OrganizationMembershipMapperV1 } from 'src/organization/mappers/v1/organization-membership.mapper';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';
import { OrganizationMembershipServiceV1 } from 'src/organization/services/v1/organization-membership.service';

describe('OrganizationMembershipServiceV1', () => {
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
    user: { findFirst: jest.fn() },
    organization: { findFirst: jest.fn() },
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
      findUnique: jest.fn(),
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
  let service: OrganizationMembershipServiceV1;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationMembershipServiceV1,
        OrganizationMapperV1,
        OrganizationMembershipMapperV1,
        { provide: PrismaService, useValue: prisma },
        {
          provide: OrganizationAccessService,
          useValue: organizationAccessService,
        },
        { provide: NotificationServiceV2, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(OrganizationMembershipServiceV1);
    prisma.user.findFirst.mockResolvedValue({ id: userId });
    prisma.organization.findFirst.mockResolvedValue({
      id: organizationId,
      name: 'Helpers',
    });
  });

  describe('inviteOrganizationMember', () => {
    const invitation = {
      userId,
      organizationId,
      role: OrganizationRole.MEMBER,
      status: MembershipStatus.PENDING,
    };

    it('should answer a caller outside the organization with the legacy 404', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        null,
      );

      await expect(
        service.inviteOrganizationMember(invitation, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION },
      });
      expect(prisma.organizationInvite.create).not.toHaveBeenCalled();
    });

    it('should forbid a plain MEMBER to invite', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MEMBER,
      );

      await expect(
        service.inviteOrganizationMember(invitation, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { code: ErrorCode.MEMBBER_DONT_HAVE_PERMISSION },
      });
    });

    it('should answer an unknown user with 404, not a foreign key 500', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.ADMIN,
      );
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.inviteOrganizationMember(invitation, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.USER_NOT_FOUND },
      });
      expect(prisma.organizationInvite.create).not.toHaveBeenCalled();
    });

    it('should answer an already active member with 409', async () => {
      organizationAccessService.getOrganizationMemberRole
        .mockResolvedValueOnce(OrganizationRole.MODERATOR)
        .mockResolvedValueOnce(OrganizationRole.MEMBER);

      await expect(
        service.inviteOrganizationMember(invitation, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { code: ErrorCode.USER_ALREADY_MEMBER },
      });
    });

    it('should invite a user who is not a member yet and notify them', async () => {
      const invite = {
        id: requestId,
        senderOrganizationId: organizationId,
        receiverUserId: userId,
        status: JoinRequestStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
        senderOrganization: { name: 'Helpers' },
        receiverUser: { name: 'Ann' },
      };

      organizationAccessService.getOrganizationMemberRole
        .mockResolvedValueOnce(OrganizationRole.ADMIN)
        .mockResolvedValueOnce(null);
      prisma.organizationInvite.create.mockResolvedValue(invite);

      await expect(
        service.inviteOrganizationMember(invitation, actingUserId),
      ).resolves.toEqual({
        status: 'success',
        code: SuccessCode.JOIN_REQUEST_CREATED,
        message: 'Invitation has been sent to the user',
        data: { invite },
      });
      expect(prisma.organizationInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            senderOrganizationId: organizationId,
            receiverUserId: userId,
          },
        }),
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_RECEIVED,
          params: { orgName: 'Helpers', userName: 'Ann' },
        }),
      );
    });
  });

  describe('removeOrganizationMember', () => {
    const allowRemoval = (): void => {
      prisma.organization.findFirst.mockResolvedValue({ name: 'Helpers' });
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MODERATOR,
      );
    };

    it('should answer a missing id with the legacy 400', async () => {
      await expect(
        service.removeOrganizationMember(userId, undefined, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { code: ErrorCode.USER_ID_OR_ORGANIZATION_ID_INVALID },
      });
    });

    it('should answer a missing organization with 404', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.ORGANIZATION_NOT_FOUND },
      });
    });

    it('should check the role of the caller, not of the member being removed', async () => {
      prisma.organization.findFirst.mockResolvedValue({ name: 'Helpers' });
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MEMBER,
      );

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(
        organizationAccessService.getOrganizationMemberRole,
      ).toHaveBeenCalledWith(actingUserId, organizationId);
      expect(prisma.userOrganization.delete).not.toHaveBeenCalled();
    });

    it('should answer a missing member with 404', async () => {
      allowRemoval();
      prisma.userOrganization.findUnique.mockResolvedValue(null);

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.MEMBER_NOT_FOUND },
      });
    });

    it('should never remove an ADMIN', async () => {
      allowRemoval();
      prisma.userOrganization.findUnique.mockResolvedValue({
        role: OrganizationRole.ADMIN,
      });

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { code: ErrorCode.MEMBBER_DONT_HAVE_PERMISSION },
      });
      expect(prisma.userOrganization.delete).not.toHaveBeenCalled();
    });

    it('should answer a member deleted concurrently with 404', async () => {
      allowRemoval();
      prisma.userOrganization.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });
      prisma.userOrganization.delete.mockRejectedValue(recordNotFound);

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.MEMBER_NOT_FOUND },
      });
    });

    it('should remove a plain member, notify them and answer without data', async () => {
      allowRemoval();
      prisma.userOrganization.findUnique.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });

      await expect(
        service.removeOrganizationMember(userId, organizationId, actingUserId),
      ).resolves.toEqual({
        status: 'success',
        code: SuccessCode.MEMBER_REMOVED_FROM_ORGANIZATION,
        message: 'Member removed from organization',
      });
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_MEMBER_REMOVED,
          params: { orgName: 'Helpers' },
        }),
      );
    });
  });

  describe('updateOrganizationMemberRole', () => {
    const roleChange = {
      organizationId,
      userId,
      role: OrganizationRole.MODERATOR,
    };

    it('should forbid anyone but an ADMIN', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MODERATOR,
      );

      await expect(
        service.updateOrganizationMemberRole(roleChange, actingUserId),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });

    it('should reject granting ADMIN with the legacy 400', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.ADMIN,
      );

      await expect(
        service.updateOrganizationMemberRole(
          { ...roleChange, role: OrganizationRole.ADMIN },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { code: ErrorCode.MEMBER_ROLE_INVALID },
      });
    });

    it('should answer a missing member with 404', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.ADMIN,
      );
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.updateOrganizationMemberRole(roleChange, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.MEMBER_NOT_FOUND },
      });
    });

    it('should never change the role of an ADMIN', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.ADMIN,
      );
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.ADMIN,
      });

      await expect(
        service.updateOrganizationMemberRole(roleChange, actingUserId),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
      expect(prisma.userOrganization.update).not.toHaveBeenCalled();
    });

    it('should update the role and notify the member with the template params', async () => {
      const result = {
        id: 'membership-id',
        userId,
        organizationId,
        role: OrganizationRole.MODERATOR,
        status: MembershipStatus.ACTIVE,
        createdAt,
        organization: { name: 'Helpers' },
      };

      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.ADMIN,
      );
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MEMBER,
      });
      prisma.userOrganization.update.mockResolvedValue(result);

      await expect(
        service.updateOrganizationMemberRole(roleChange, actingUserId),
      ).resolves.toMatchObject({
        code: SuccessCode.MEMBER_ROLE_UPDATED,
        data: { result },
      });
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ORG_ROLE_UPDATED,
          params: { orgName: 'Helpers', role: OrganizationRole.MODERATOR },
        }),
      );
    });
  });

  describe('createJoinRequest', () => {
    it('should reject the FROM_ORGANIZATION direction with a code-less 400', async () => {
      await expect(
        service.createJoinRequest(
          { direction: JoinRequestDirectionV1.FROM_ORGANIZATION },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { code: null },
      });
      expect(prisma.organizationJoinRequest.create).not.toHaveBeenCalled();
    });

    it('should reject a request without a receiving organization', async () => {
      await expect(
        service.createJoinRequest(
          { direction: JoinRequestDirectionV1.FROM_USER },
          actingUserId,
        ),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });

    it('should answer an unknown organization with 404, not a foreign key 500', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.createJoinRequest(
          {
            direction: JoinRequestDirectionV1.FROM_USER,
            receiverOrganizationId: organizationId,
          },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.ORGANIZATION_NOT_FOUND },
      });
      expect(prisma.organizationJoinRequest.create).not.toHaveBeenCalled();
    });

    it('should answer a pending duplicate with the legacy 400, not 409', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue({
        id: requestId,
      });

      await expect(
        service.createJoinRequest(
          {
            direction: JoinRequestDirectionV1.FROM_USER,
            receiverOrganizationId: organizationId,
          },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { code: ErrorCode.JOIN_REQUEST_ALREADY_EXISTS },
      });
    });

    it('should create the request and notify every staff member', async () => {
      const joinRequest = {
        id: requestId,
        senderId: actingUserId,
        receiverOrganizationId: organizationId,
        status: JoinRequestStatus.PENDING,
        createdAt,
        updatedAt: createdAt,
        sender: { name: 'Ann' },
        receiverOrganization: { name: 'Helpers' },
      };

      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);
      prisma.organizationJoinRequest.create.mockResolvedValue(joinRequest);
      prisma.userOrganization.findMany.mockResolvedValue([
        { userId: 'admin-id' },
        { userId: 'moderator-id' },
      ]);

      await expect(
        service.createJoinRequest(
          {
            direction: JoinRequestDirectionV1.FROM_USER,
            receiverOrganizationId: organizationId,
          },
          actingUserId,
        ),
      ).resolves.toMatchObject({
        code: SuccessCode.JOIN_REQUEST_CREATED,
        data: { joinRequest },
      });
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'moderator-id',
          params: { userName: 'Ann', orgName: 'Helpers' },
        }),
      );
    });
  });

  describe('updateJoinRequestStatus', () => {
    const pendingJoinRequest = {
      senderId: userId,
      receiverOrganizationId: organizationId,
      receiverOrganization: { name: 'Helpers' },
    };
    const pendingInvite = {
      receiverUserId: userId,
      senderOrganizationId: organizationId,
      senderOrganization: { name: 'Helpers' },
    };
    const updatedRow = { id: requestId, status: JoinRequestStatus.ACCEPTED };

    const findOnly = (
      joinRequest: typeof pendingJoinRequest | null,
      invite: typeof pendingInvite | null,
    ): void => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(joinRequest);
      prisma.organizationInvite.findFirst.mockResolvedValue(invite);
    };

    it('should answer a missing pending request with a code-less 404', async () => {
      findOnly(null, null);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.ACCEPTED },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: null },
      });
    });

    it('should let only the sender cancel a join request', async () => {
      findOnly(pendingJoinRequest, null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.CANCELLED },
          actingUserId,
        ),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });

    it('should cancel the sender own request without membership or notification', async () => {
      findOnly(pendingJoinRequest, null);
      prisma.organizationJoinRequest.update.mockResolvedValue(updatedRow);

      await service.updateJoinRequestStatus(
        { id: requestId, status: JoinRequestStatus.CANCELLED },
        userId,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.userOrganization.upsert).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should keep the legacy PENDING rewrite free of side effects', async () => {
      findOnly(pendingJoinRequest, null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.organizationJoinRequest.update.mockResolvedValue(updatedRow);

      await service.updateJoinRequestStatus(
        { id: requestId, status: JoinRequestStatus.PENDING },
        actingUserId,
      );

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should forbid a non-manager to accept a join request', async () => {
      findOnly(pendingJoinRequest, null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.ACCEPTED },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.FORBIDDEN,
        response: { code: ErrorCode.MEMBBER_DONT_HAVE_PERMISSION },
      });
    });

    it('should accept a join request and upsert the membership in one transaction', async () => {
      findOnly(pendingJoinRequest, null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.$transaction.mockResolvedValue([updatedRow, { id: 'membership' }]);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.ACCEPTED },
          actingUserId,
        ),
      ).resolves.toMatchObject({
        code: SuccessCode.JOIN_REQUEST_STATUS_UPDATED,
        data: { result: updatedRow },
      });
      expect(prisma.organizationJoinRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: requestId,
            status: JoinRequestStatus.PENDING,
            deletedAt: null,
          },
        }),
      );
      expect(prisma.userOrganization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_organizationId: { userId, organizationId } },
          update: { status: MembershipStatus.ACTIVE, deletedAt: null },
        }),
      );
      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_ACCEPTED,
        }),
      );
    });

    it('should answer a request processed concurrently with a code-less 404', async () => {
      findOnly(pendingJoinRequest, null);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.$transaction.mockRejectedValue(recordNotFound);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.ACCEPTED },
          actingUserId,
        ),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: null },
      });
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    });

    it('should let only the invited user accept an invite', async () => {
      findOnly(null, pendingInvite);

      await expect(
        service.updateJoinRequestStatus(
          { id: requestId, status: JoinRequestStatus.ACCEPTED },
          actingUserId,
        ),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });

    it('should let the inviting organization staff cancel an invite', async () => {
      findOnly(null, pendingInvite);
      organizationAccessService.isOrganizationManager.mockResolvedValue(true);
      prisma.organizationInvite.update.mockResolvedValue(updatedRow);

      await service.updateJoinRequestStatus(
        { id: requestId, status: JoinRequestStatus.CANCELLED },
        actingUserId,
      );

      expect(
        organizationAccessService.isOrganizationManager,
      ).toHaveBeenCalledWith(actingUserId, organizationId);
      expect(prisma.organizationInvite.update).toHaveBeenCalled();
    });

    it('should notify the invited user when they reject the invite', async () => {
      findOnly(null, pendingInvite);
      prisma.organizationInvite.update.mockResolvedValue(updatedRow);

      await service.updateJoinRequestStatus(
        { id: requestId, status: JoinRequestStatus.REJECTED },
        userId,
      );

      expect(notificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          type: NotificationType.ORG_JOIN_REQUEST_REJECTED,
          params: { orgName: 'Helpers' },
        }),
      );
    });
  });

  describe('getOrganizationJoinRequests', () => {
    it('should forbid a plain member', async () => {
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MEMBER,
      );

      await expect(
        service.getOrganizationJoinRequests(organizationId, actingUserId),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });

    it('should list pending requests with the sender profile under the legacy key', async () => {
      const profile = {
        id: 'profile-id',
        userId,
        bio: null,
        avatar: null,
        gender: null,
        birthDate: null,
        phoneNumber: null,
      };

      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        OrganizationRole.MODERATOR,
      );
      prisma.organizationJoinRequest.findMany.mockResolvedValue([
        {
          id: requestId,
          senderId: userId,
          receiverOrganizationId: organizationId,
          status: JoinRequestStatus.PENDING,
          createdAt,
          updatedAt: createdAt,
          sender: { id: userId, userProfile: profile },
        },
      ]);

      const response = await service.getOrganizationJoinRequests(
        organizationId,
        actingUserId,
      );

      expect(response.code).toBe(SuccessCode.JOIN_REQUESTS_RETRIEVED);
      expect(response.data.joinRequests[0].sender).toEqual({
        id: userId,
        profile,
      });
    });
  });

  describe('getJoinRequestById', () => {
    const organizationRow = {
      id: organizationId,
      name: 'Helpers',
      createdAt,
      phoneNumber: null,
      email: null,
      description: null,
      additionalInfo: null,
      avatarUrl: null,
      locationId: null,
    };
    const joinRequestRow = {
      id: requestId,
      senderId: userId,
      receiverOrganizationId: organizationId,
      status: JoinRequestStatus.PENDING,
      createdAt,
      updatedAt: createdAt,
      sender: { id: userId, name: 'Ann', userProfile: null },
      receiverOrganization: organizationRow,
    };
    const inviteRow = {
      id: requestId,
      senderOrganizationId: organizationId,
      receiverUserId: userId,
      status: JoinRequestStatus.PENDING,
      createdAt,
      updatedAt: createdAt,
      senderOrganization: organizationRow,
    };

    it('should answer a missing request with 404', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);
      prisma.organizationInvite.findFirst.mockResolvedValue(null);

      await expect(
        service.getJoinRequestById(requestId, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.JOIN_REQUEST_NOT_FOUND },
      });
    });

    it('should answer a processed request with the legacy 400', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue({
        ...joinRequestRow,
        status: JoinRequestStatus.ACCEPTED,
      });
      prisma.organizationInvite.findFirst.mockResolvedValue(null);

      await expect(
        service.getJoinRequestById(requestId, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { code: ErrorCode.JOIN_REQUEST_ALREADY_PROCESSED },
      });
    });

    it('should show the sender their own request in the code-less envelope', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        joinRequestRow,
      );
      prisma.organizationInvite.findFirst.mockResolvedValue(null);

      const response = await service.getJoinRequestById(requestId, userId);

      expect(response).toEqual({
        status: 'success',
        data: { joinRequest: expect.objectContaining({ id: requestId }) },
      });
      expect(
        organizationAccessService.getOrganizationMemberRole,
      ).not.toHaveBeenCalled();
    });

    it('should answer a stranger outside the organization with the legacy 404', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(
        joinRequestRow,
      );
      prisma.organizationInvite.findFirst.mockResolvedValue(null);
      organizationAccessService.getOrganizationMemberRole.mockResolvedValue(
        null,
      );

      await expect(
        service.getJoinRequestById(requestId, actingUserId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION },
      });
    });

    it('should show the invited user their own invite', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);
      prisma.organizationInvite.findFirst.mockResolvedValue(inviteRow);

      const response = await service.getJoinRequestById(requestId, userId);

      expect(response.data.joinRequest).toMatchObject({
        receiverUserId: userId,
        senderOrganization: { id: organizationId, name: 'Helpers' },
      });
    });

    it('should forbid a stranger to view an invite', async () => {
      prisma.organizationJoinRequest.findFirst.mockResolvedValue(null);
      prisma.organizationInvite.findFirst.mockResolvedValue(inviteRow);
      organizationAccessService.isOrganizationManager.mockResolvedValue(false);

      await expect(
        service.getJoinRequestById(requestId, actingUserId),
      ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
    });
  });
});
