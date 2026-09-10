import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { LoginDto } from 'src/auth/controllers/v2/requests/login.dto';
import { AuthV2Service } from 'src/auth/services/v2/auth-v2.service';
import { EmailService } from '@shared/services/email.service';
import { HashService } from '@shared/services/hash.service';
import { TokensService } from '@shared/services/tokens.service';
import { I18nService } from 'src/i18n/services/i18n.service';

// NOTE: jose ships ESM only and jest does not transform node_modules, so the
// import chain through TokensService has to be stubbed out.
jest.mock('jose', () => ({ SignJWT: jest.fn(), jwtVerify: jest.fn() }));

describe('AuthV2Service', () => {
  let service: AuthV2Service;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTokensService = {
    verifyRefreshToken: jest.fn(),
    createTokenPair: jest.fn(),
    getRefreshTokenExpiresInMs: jest.fn(),
  };

  const mockHashService = {
    verifyPassword: jest.fn(),
  };

  const credentials: LoginDto = {
    email: 'user@example.com',
    password: 'correct-password',
  };

  const liveUser = {
    id: 'user-id',
    email: credentials.email,
    name: 'User',
    role: SiteRole.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    password: 'hashed-password',
  };

  const storedToken = {
    id: 'refresh-token-id',
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 'user-id', role: SiteRole.USER },
  };

  const tokenPair = { accessToken: 'new-access', refreshToken: 'new-refresh' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthV2Service,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: HashService, useValue: mockHashService },
        { provide: EmailService, useValue: {} },
        { provide: I18nService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthV2Service>(AuthV2Service);

    jest.clearAllMocks();

    mockTokensService.verifyRefreshToken.mockResolvedValue({
      sub: storedToken.user.id,
    });
    mockTokensService.createTokenPair.mockResolvedValue(tokenPair);
    mockTokensService.getRefreshTokenExpiresInMs.mockReturnValue(60_000);
    mockHashService.verifyPassword.mockResolvedValue(true);
  });

  describe('login', () => {
    it('should look the user up with a deletedAt: null filter', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(liveUser);

      await service.login(credentials);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: credentials.email, deletedAt: null },
        }),
      );
    });

    it('should refuse a soft-deleted user holding the right password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(mockTokensService.createTokenPair).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should still log a live user in', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(liveUser);

      const result = await service.login(credentials);

      expect(result.tokens).toEqual(tokenPair);
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should look the stored token up with a deletedAt: null filter on its owner', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(storedToken);

      await service.refreshTokens('refresh-token');

      expect(mockPrismaService.refreshToken.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            token: 'refresh-token',
            revokedAt: null,
            user: { deletedAt: null },
          },
        }),
      );
    });

    it('should reject a token whose owner is soft-deleted with a standard 401', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
      expect(mockPrismaService.refreshToken.update).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should still issue a new pair for a live owner', async () => {
      mockPrismaService.refreshToken.findFirst.mockResolvedValue(storedToken);

      const result = await service.refreshTokens('refresh-token');

      expect(result).toEqual({ tokens: tokenPair });
    });
  });
});
