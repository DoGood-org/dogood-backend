import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MembershipStatus, OrganizationRole, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { LocationService } from 'src/location/services/location.service';
import { OrganizationSortFieldV2 } from 'src/organization/interfaces/organization';
import { OrganizationMapperV2 } from 'src/organization/mappers/v2/organization.mapper';
import { OrganizationServiceV2 } from 'src/organization/services/v2/organization.service';

describe('OrganizationServiceV2', () => {
  const userId = 'user-id';
  const organizationId = 'organization-id';
  const organizationRow = {
    id: organizationId,
    name: 'Helpers',
    description: null,
    phoneNumber: null,
    email: null,
    additionalInfo: null,
    avatarUrl: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    location: null,
    hostProfile: { id: 'host-id' },
  };
  const prismaError = (code: string): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError(code, {
      code,
      clientVersion: 'test',
    });
  const prisma = {
    organization: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userOrganization: { findMany: jest.fn() },
    task: { findMany: jest.fn() },
  };
  const locationService = { createLocation: jest.fn() };
  let service: OrganizationServiceV2;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationServiceV2,
        OrganizationMapperV2,
        { provide: PrismaService, useValue: prisma },
        { provide: LocationService, useValue: locationService },
      ],
    }).compile();

    service = moduleRef.get(OrganizationServiceV2);
  });

  describe('getOrganizations', () => {
    it('should page live organizations by name with an id tiebreaker by default', async () => {
      prisma.organization.findMany.mockResolvedValue([]);

      await service.getOrganizations({});

      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, name: undefined },
        orderBy: [{ name: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }],
        skip: 0,
        take: 20,
        select: { id: true, name: true, avatarUrl: true },
      });
    });

    it('should search by partial name and honour the requested sort', async () => {
      prisma.organization.findMany.mockResolvedValue([]);

      await service.getOrganizations({
        search: 'help',
        sort: OrganizationSortFieldV2.CREATED_AT,
        sortDirection: Prisma.SortOrder.desc,
        skip: 40,
        limit: 10,
      });

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            name: { contains: 'help', mode: Prisma.QueryMode.insensitive },
          },
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 40,
          take: 10,
        }),
      );
    });
  });

  describe('createOrganization', () => {
    it('should create with the caller as active ADMIN and flatten the host', async () => {
      locationService.createLocation.mockResolvedValue('location-id');
      prisma.organization.create.mockResolvedValue(organizationRow);

      const organization = await service.createOrganization(
        { name: 'Helpers', location: { country: 'Ukraine' } },
        userId,
      );

      expect(prisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'Helpers',
            locationId: 'location-id',
            members: {
              create: {
                userId,
                role: OrganizationRole.ADMIN,
                status: MembershipStatus.ACTIVE,
              },
            },
          },
        }),
      );
      expect(organization.hostId).toBe('host-id');
    });

    it('should turn a duplicate name into 409 without a pre-check', async () => {
      prisma.organization.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.createOrganization({ name: 'Helpers' }, userId),
      ).rejects.toThrow(ConflictException);
      expect(prisma.organization.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('getOrganizationById', () => {
    it('should answer a missing or deleted organization with 404', async () => {
      prisma.organization.findFirst.mockResolvedValue(null);

      await expect(service.getOrganizationById(organizationId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: organizationId, deletedAt: null },
        }),
      );
    });
  });

  describe('getOrganizationMembers', () => {
    it('should page active members of a live organization', async () => {
      prisma.userOrganization.findMany.mockResolvedValue([
        {
          role: OrganizationRole.ADMIN,
          user: { id: userId, name: 'Ann', userProfile: { avatar: null } },
        },
      ]);

      const members = await service.getOrganizationMembers(organizationId, {
        skip: 20,
      });

      expect(prisma.userOrganization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId,
            status: MembershipStatus.ACTIVE,
            deletedAt: null,
            organization: { deletedAt: null },
          },
          orderBy: [
            { createdAt: Prisma.SortOrder.asc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 20,
          take: 20,
        }),
      );
      expect(members).toEqual([
        { userId, name: 'Ann', avatar: null, role: OrganizationRole.ADMIN },
      ]);
    });
  });

  describe('getOrganizationTasks', () => {
    it('should page live tasks hosted by the organization', async () => {
      prisma.task.findMany.mockResolvedValue([]);

      await service.getOrganizationTasks(organizationId, { limit: 5 });

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            host: { organizationId, organization: { deletedAt: null } },
          },
          orderBy: [
            { createdAt: Prisma.SortOrder.desc },
            { id: Prisma.SortOrder.asc },
          ],
          skip: 0,
          take: 5,
        }),
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update only a live organization', async () => {
      prisma.organization.update.mockResolvedValue(organizationRow);

      await service.updateOrganization(organizationId, { description: 'New' });

      expect(prisma.organization.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: organizationId, deletedAt: null },
          data: { description: 'New', locationId: undefined },
        }),
      );
      expect(locationService.createLocation).not.toHaveBeenCalled();
    });

    it('should map a duplicate name to 409 and a missing row to 404', async () => {
      prisma.organization.update.mockRejectedValueOnce(prismaError('P2002'));
      prisma.organization.update.mockRejectedValueOnce(prismaError('P2025'));

      await expect(
        service.updateOrganization(organizationId, { name: 'Taken' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.updateOrganization(organizationId, { name: 'Other' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteOrganization', () => {
    it('should soft delete a live organization and never touch Location', async () => {
      prisma.organization.update.mockResolvedValue({ id: organizationId });

      await service.deleteOrganization(organizationId);

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: organizationId, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
        select: { id: true },
      });
    });

    it('should answer an already deleted organization with 404', async () => {
      prisma.organization.update.mockRejectedValue(prismaError('P2025'));

      await expect(service.deleteOrganization(organizationId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
