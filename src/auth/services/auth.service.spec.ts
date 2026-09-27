import { SiteRole } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { EmailService } from '@shared/services/email.service';
import { HashService } from '@shared/services/hash.service';
import { TokensService } from '@shared/services/tokens.service';
import { AuthService } from 'src/auth/services/auth.service';
import { I18nService } from 'src/i18n/services/i18n.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the service gets a mocked TokensService anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

describe('AuthService', () => {
  const prisma = {
    refreshToken: { findFirst: jest.fn(), update: jest.fn() },
  };
  const tokensService = {
    verifyRefreshToken: jest.fn(),
    createTokenPair: jest.fn(),
    getRefreshTokenExpiresInMs: jest.fn(),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    tokensService as unknown as TokensService,
    {} as HashService,
    {} as EmailService,
    {} as I18nService,
  );
  const now = new Date('2026-09-28T12:00:00Z');

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('refreshTokens', () => {
    it('should rotate the refresh token in place, keeping the session row', async () => {
      const tokens = { accessToken: 'access-2', refreshToken: 'refresh-2' };
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: 'session-1',
        expiresAt: new Date('2026-10-01T00:00:00Z'),
        user: { id: 'user-1', role: SiteRole.USER },
      });
      tokensService.createTokenPair.mockResolvedValue(tokens);
      tokensService.getRefreshTokenExpiresInMs.mockReturnValue(1000);

      await expect(
        service.refreshTokens('refresh-1', '1.2.3.4', 'agent'),
      ).resolves.toEqual({ tokens });
      expect(prisma.refreshToken.update).toHaveBeenCalledTimes(1);
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          token: 'refresh-2',
          ip: '1.2.3.4',
          userAgent: 'agent',
          expiresAt: new Date(now.getTime() + 1000),
        },
      });
    });
  });
});
