import { Test } from '@nestjs/testing';
import { MembershipStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

describe('OrganizationAccessService', () => {
  const userId = 'user-id';
  const organizationId = 'organization-id';
  const prisma = { userOrganization: { findFirst: jest.fn() } };
  let service: OrganizationAccessService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(OrganizationAccessService);
  });

  describe('isOrganizationManager', () => {
    it('should require an active admin or moderator membership in a live organization', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue({ id: 'm-id' });

      await expect(
        service.isOrganizationManager(userId, organizationId),
      ).resolves.toBe(true);
      expect(prisma.userOrganization.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          organizationId,
          status: MembershipStatus.ACTIVE,
          role: { in: [OrganizationRole.ADMIN, OrganizationRole.MODERATOR] },
          deletedAt: null,
          organization: { deletedAt: null },
        },
        select: { id: true },
      });
    });

    it('should reject a member whose membership row is gone', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.isOrganizationManager(userId, organizationId),
      ).resolves.toBe(false);
    });

    it('should not let a manager of one organization act for another', async () => {
      prisma.userOrganization.findFirst.mockImplementation(
        ({ where }: { where: { organizationId: string } }) =>
          Promise.resolve(
            where.organizationId === organizationId ? { id: 'm-id' } : null,
          ),
      );

      await expect(
        service.isOrganizationManager(userId, organizationId),
      ).resolves.toBe(true);
      await expect(
        service.isOrganizationManager(userId, 'other-organization-id'),
      ).resolves.toBe(false);
    });
  });

  describe('getOrganizationMemberRole', () => {
    it('should read the role of an active membership in a live organization', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue({
        role: OrganizationRole.MODERATOR,
      });

      await expect(
        service.getOrganizationMemberRole(userId, organizationId),
      ).resolves.toBe(OrganizationRole.MODERATOR);
      expect(prisma.userOrganization.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          organizationId,
          status: MembershipStatus.ACTIVE,
          deletedAt: null,
          organization: { deletedAt: null },
        },
        select: { role: true },
      });
    });

    it('should return null for a non-member', async () => {
      prisma.userOrganization.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationMemberRole(userId, organizationId),
      ).resolves.toBeNull();
    });
  });

  describe('isOrganizationAdmin', () => {
    it('should accept only the ADMIN role', async () => {
      prisma.userOrganization.findFirst.mockResolvedValueOnce({
        role: OrganizationRole.ADMIN,
      });
      prisma.userOrganization.findFirst.mockResolvedValueOnce({
        role: OrganizationRole.MODERATOR,
      });
      prisma.userOrganization.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.isOrganizationAdmin(userId, organizationId),
      ).resolves.toBe(true);
      await expect(
        service.isOrganizationAdmin(userId, organizationId),
      ).resolves.toBe(false);
      await expect(
        service.isOrganizationAdmin(userId, organizationId),
      ).resolves.toBe(false);
    });
  });
});
