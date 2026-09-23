import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MembershipStatus, OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { LocationService } from 'src/location/services/location.service';
import { OrganizationMapperV1 } from 'src/organization/mappers/v1/organization.mapper';
import { OrganizationServiceV1 } from 'src/organization/services/v1/organization.service';

describe('OrganizationServiceV1', () => {
  const userId = 'user-id';
  const organizationId = 'organization-id';
  const createdAt = new Date('2026-09-01T10:00:00Z');
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
    location: null,
  };
  const prisma = {
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userOrganization: { findMany: jest.fn(), deleteMany: jest.fn() },
    task: { deleteMany: jest.fn() },
    host: { deleteMany: jest.fn() },
    userReview: { deleteMany: jest.fn() },
    organizationReview: { deleteMany: jest.fn() },
    taskReview: { deleteMany: jest.fn() },
    systemReview: { deleteMany: jest.fn() },
    location: { delete: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const locationService = { createLocation: jest.fn() };
  let service: OrganizationServiceV1;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationServiceV1,
        OrganizationMapperV1,
        { provide: PrismaService, useValue: prisma },
        { provide: LocationService, useValue: locationService },
      ],
    }).compile();

    service = moduleRef.get(OrganizationServiceV1);
  });

  describe('createOrganization', () => {
    it('should answer an existing name with the legacy 409', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'other-id' });

      await expect(
        service.createOrganization({ name: 'Helpers' }, userId),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { code: ErrorCode.ORGANIZATION_ALREADY_EXISTS },
      });
      expect(prisma.organization.create).not.toHaveBeenCalled();
    });

    it('should create the organization with the caller as active ADMIN and the resolved location', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      locationService.createLocation.mockResolvedValue('location-id');
      prisma.organization.create.mockResolvedValue({
        ...organizationRow,
        members: [],
      });

      const response = await service.createOrganization(
        {
          name: 'Helpers',
          avatar: 'https://example.com/a.png',
          moreInfo: 'More',
          location: { city: 'Kyiv' },
        },
        userId,
      );

      expect(locationService.createLocation).toHaveBeenCalledWith({
        country: '',
        region: '',
        city: 'Kyiv',
      });
      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Helpers',
            avatarUrl: 'https://example.com/a.png',
            additionalInfo: 'More',
            locationId: 'location-id',
            members: {
              create: {
                userId,
                role: OrganizationRole.ADMIN,
                status: MembershipStatus.ACTIVE,
              },
            },
          }),
        }),
      );
      expect(response).toMatchObject({
        status: 'success',
        code: SuccessCode.ORGANIZATION_CREATED,
        message: 'Organization was created successfully',
        data: { organization: { id: organizationId, members: [] } },
      });
    });
  });

  describe('getOrganizationsByName', () => {
    it.each([undefined, '', '   ', ['a', 'b']])(
      'should reject the name query %p with the legacy 400',
      async (name) => {
        await expect(
          service.getOrganizationsByName(name),
        ).rejects.toMatchObject({
          status: HttpStatus.BAD_REQUEST,
          response: { code: ErrorCode.ORGANIZATION_NAME_QUERY_INVALID },
        });
      },
    );

    it('should search live organizations by a trimmed partial name, 20 at most', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: organizationId, name: 'Helpers', avatarUrl: null },
      ]);

      const response = await service.getOrganizationsByName(' help ');

      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'help', mode: Prisma.QueryMode.insensitive },
          deletedAt: null,
        },
        take: 20,
        select: { id: true, name: true, avatarUrl: true },
      });
      expect(response.data).toEqual([
        { id: organizationId, name: 'Helpers', avatar: null },
      ]);
    });
  });

  describe('getOrganizationById', () => {
    it('should answer a missing or deleted organization with the legacy 404', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationById(organizationId),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        response: { code: ErrorCode.ORGANIZATION_NOT_FOUND },
      });
      expect(prisma.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: organizationId, deletedAt: null },
        }),
      );
    });

    it('should select only active members without password or email', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationById(organizationId),
      ).rejects.toThrow();

      const [{ select }] = prisma.organization.findFirst.mock.calls[0] as [
        { select: { members: unknown } },
      ];

      expect(select.members).toEqual({
        where: { status: MembershipStatus.ACTIVE, deletedAt: null },
        select: {
          id: true,
          role: true,
          status: true,
          userId: true,
          organizationId: true,
          user: {
            select: {
              id: true,
              name: true,
              userProfile: { select: { avatar: true } },
            },
          },
        },
      });
    });
  });

  describe('updateOrganization', () => {
    it('should answer a duplicate name with 409 instead of a 500', async () => {
      prisma.organization.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.updateOrganization(organizationId, { name: 'Taken' }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        response: { code: ErrorCode.ORGANIZATION_ALREADY_EXISTS },
      });
    });

    it('should leave the location alone when the address resolves to nothing', async () => {
      locationService.createLocation.mockResolvedValue(null);
      prisma.organization.update.mockResolvedValue(organizationRow);

      const response = await service.updateOrganization(organizationId, {
        location: {},
        moreInfo: 'More',
      });

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: organizationId },
          data: expect.objectContaining({
            locationId: undefined,
            additionalInfo: 'More',
          }),
        }),
      );
      expect(response.code).toBe(SuccessCode.ORGANIZATION_UPDATED);
    });
  });

  describe('deleteOrganization', () => {
    it('should hard-delete the organization and its dependants but never the Location row', async () => {
      prisma.$transaction.mockResolvedValue([]);

      const response = await service.deleteOrganization(organizationId);

      const authoredWhere = { where: { authorOrganizationId: organizationId } };

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { host: { organizationId } },
      });
      expect(prisma.host.deleteMany).toHaveBeenCalledWith({
        where: { organizationId },
      });
      expect(prisma.userOrganization.deleteMany).toHaveBeenCalledWith({
        where: { organizationId },
      });
      expect(prisma.userReview.deleteMany).toHaveBeenCalledWith(authoredWhere);
      expect(prisma.organizationReview.deleteMany).toHaveBeenCalledWith(
        authoredWhere,
      );
      expect(prisma.taskReview.deleteMany).toHaveBeenCalledWith(authoredWhere);
      expect(prisma.systemReview.deleteMany).toHaveBeenCalledWith(
        authoredWhere,
      );
      expect(prisma.organization.delete).toHaveBeenCalledWith({
        where: { id: organizationId },
        select: { id: true },
      });
      expect(prisma.location.delete).not.toHaveBeenCalled();
      expect(prisma.location.deleteMany).not.toHaveBeenCalled();
      expect(response).toEqual({
        status: 'success',
        code: SuccessCode.ORGANIZATION_DELETED,
        message: 'Organization and all related data were deleted',
        data: {
          result: {
            message: 'Organization and related data deleted successfully',
          },
        },
      });
    });
  });

  describe('getOrganizationMembers', () => {
    it('should list only active members of a live organization', async () => {
      prisma.userOrganization.findMany.mockResolvedValue([]);

      const response = await service.getOrganizationMembers(organizationId);

      expect(prisma.userOrganization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId,
            status: MembershipStatus.ACTIVE,
            deletedAt: null,
            organization: { deletedAt: null },
          },
        }),
      );
      expect(response).toEqual({
        status: 'success',
        code: SuccessCode.ORGANIZATION_MEMBERS_RETRIEVED,
        message: "Member's list ready",
        data: { members: [] },
      });
    });
  });
});
