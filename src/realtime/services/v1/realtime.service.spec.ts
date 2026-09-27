import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { RealtimeServiceV1 } from 'src/realtime/services/v1/realtime.service';

describe('RealtimeServiceV1', () => {
  const prisma = {
    refreshToken: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const service = new RealtimeServiceV1(prisma as unknown as PrismaService);
  const now = new Date('2026-09-28T12:00:00Z');

  const activeSessionWhere = (role?: SiteRole): object => ({
    revokedAt: null,
    expiresAt: { gt: now },
    user: { deletedAt: null, status: { not: UserStatus.BANNED }, role },
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('findSocketSession', () => {
    it('should return the session of a live refresh token of the user', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'session-1',
        user: { role: SiteRole.ADMIN },
      });

      await expect(service.findSocketSession('user-1', 'ref')).resolves.toEqual(
        { sessionId: 'session-1', role: SiteRole.ADMIN },
      );
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { token: 'ref', userId: 'user-1', ...activeSessionWhere() },
        select: { id: true, user: { select: { role: true } } },
      });
    });

    it('should return null for a revoked, expired, banned or deleted session', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.findSocketSession('user-1', 'ref'),
      ).resolves.toBeNull();
    });
  });

  describe('isSocketSessionActive', () => {
    it.each([
      [{ id: 'session-1' }, true],
      [null, false],
    ])('should map %p to %p', async (row, expected) => {
      prisma.refreshToken.findFirst.mockResolvedValue(row);

      await expect(
        service.isSocketSessionActive('session-1', SiteRole.USER),
      ).resolves.toBe(expected);
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', ...activeSessionWhere(SiteRole.USER) },
        select: { id: true },
      });
    });
  });

  describe('getActiveSocketSessionRoles', () => {
    it('should map every active session to its current role', async () => {
      prisma.refreshToken.findMany.mockResolvedValue([
        { id: 'session-1', user: { role: SiteRole.USER } },
        { id: 'session-2', user: { role: SiteRole.ADMIN } },
      ]);

      await expect(
        service.getActiveSocketSessionRoles(['session-1', 'session-2', 'x']),
      ).resolves.toEqual(
        new Map([
          ['session-1', SiteRole.USER],
          ['session-2', SiteRole.ADMIN],
        ]),
      );
      expect(prisma.refreshToken.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['session-1', 'session-2', 'x'] },
          ...activeSessionWhere(),
        },
        select: { id: true, user: { select: { role: true } } },
      });
    });
  });
});
