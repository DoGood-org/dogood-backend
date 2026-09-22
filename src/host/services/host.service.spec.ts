import { NotFoundException } from '@nestjs/common';
import { HostType, Prisma } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { HostService } from 'src/host/services/host.service';

describe('HostService', () => {
  const prisma = { host: { upsert: jest.fn() } };
  const service = new HostService(prisma as unknown as PrismaService);

  const prismaError = (code: string): Prisma.PrismaClientKnownRequestError =>
    new Prisma.PrismaClientKnownRequestError(code, {
      code,
      clientVersion: 'test',
    });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('createHostByUser', () => {
    it('should upsert an active user host and return it', async () => {
      const host = {
        id: 'host-1',
        type: HostType.USER,
        userId: 'user-1',
        organizationId: null,
      };
      prisma.host.upsert.mockResolvedValue(host);

      await expect(service.createHostByUser('user-1')).resolves.toBe(host);
      expect(prisma.host.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        update: { type: HostType.USER, organizationId: null },
        create: { type: HostType.USER, userId: 'user-1' },
        select: { id: true, type: true, userId: true, organizationId: true },
      });
    });

    it('should throw host not found when a soft-deleted host holds the user id', async () => {
      prisma.host.upsert.mockRejectedValue(prismaError('P2002'));

      await expect(service.createHostByUser('user-1')).rejects.toEqual(
        new NotFoundException('Host not found'),
      );
    });

    it('should throw user not found when the user does not exist', async () => {
      prisma.host.upsert.mockRejectedValue(prismaError('P2003'));

      await expect(service.createHostByUser('user-1')).rejects.toEqual(
        new NotFoundException('User not found'),
      );
    });

    it('should rethrow unrelated errors', async () => {
      const error = prismaError('P2034');
      prisma.host.upsert.mockRejectedValue(error);

      await expect(service.createHostByUser('user-1')).rejects.toBe(error);
    });
  });

  describe('createHostByOrganization', () => {
    it('should upsert an active organization host and return it', async () => {
      const host = {
        id: 'host-2',
        type: HostType.ORGANIZATION,
        userId: null,
        organizationId: 'org-1',
      };
      prisma.host.upsert.mockResolvedValue(host);

      await expect(service.createHostByOrganization('org-1')).resolves.toBe(
        host,
      );
      expect(prisma.host.upsert).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', deletedAt: null },
        update: { type: HostType.ORGANIZATION, userId: null },
        create: { type: HostType.ORGANIZATION, organizationId: 'org-1' },
        select: { id: true, type: true, userId: true, organizationId: true },
      });
    });

    it('should throw host not found when a soft-deleted host holds the organization id', async () => {
      prisma.host.upsert.mockRejectedValue(prismaError('P2002'));

      await expect(service.createHostByOrganization('org-1')).rejects.toEqual(
        new NotFoundException('Host not found'),
      );
    });

    it('should throw organization not found when the organization does not exist', async () => {
      prisma.host.upsert.mockRejectedValue(prismaError('P2003'));

      await expect(service.createHostByOrganization('org-1')).rejects.toEqual(
        new NotFoundException('Organization not found'),
      );
    });

    it('should rethrow unrelated errors', async () => {
      const error = new Error('connection lost');
      prisma.host.upsert.mockRejectedValue(error);

      await expect(service.createHostByOrganization('org-1')).rejects.toBe(
        error,
      );
    });
  });
});
