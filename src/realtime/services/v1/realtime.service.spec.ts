import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

describe('RealtimeServiceV1', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const service = new RealtimeServiceV1(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getSocketUserRole', () => {
    it.each([
      [null, null],
      [{ status: UserStatus.BANNED, role: SiteRole.USER }, null],
      [{ status: UserStatus.ACTIVE, role: SiteRole.ADMIN }, SiteRole.ADMIN],
    ])('should map user %p to role %p', async (user, expected) => {
      prisma.user.findUnique.mockResolvedValue(user);

      await expect(service.getSocketUserRole('user-1')).resolves.toBe(expected);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
        select: { status: true, role: true },
      });
    });
  });
});
