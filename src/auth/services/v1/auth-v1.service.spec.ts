import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { LoginDto } from 'src/auth/controllers/v1/dto/login.dto';
import { AuthV1Service } from 'src/auth/services/v1/auth-v1.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { EmailService } from '@shared/services/email.service';
import { HashService } from '@shared/services/hash.service';
import { TokensService } from '@shared/services/tokens.service';
import { I18nService } from 'src/i18n/services/i18n.service';

// NOTE: jose ships ESM only and jest does not transform node_modules, so the
// import chain through TokensService has to be stubbed out.
jest.mock('jose', () => ({ SignJWT: jest.fn(), jwtVerify: jest.fn() }));

describe('AuthV1Service', () => {
  let service: AuthV1Service;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
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
    createdAt: new Date(),
    ban: null,
  };

  const storedToken = {
    id: 'refresh-token-id',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    updatedAt: new Date(),
    user: {
      id: 'user-id',
      role: SiteRole.USER,
      status: UserStatus.ACTIVE,
      createdAt: new Date(),
      ban: null,
    },
  };

  const tokenPair = { accessToken: 'new-access', refreshToken: 'new-refresh' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthV1Service,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: HashService, useValue: mockHashService },
        { provide: EmailService, useValue: {} },
        { provide: I18nService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthV1Service>(AuthV1Service);

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

      await expect(service.login(credentials)).rejects.toThrow(V1ApiException);
      expect(mockTokensService.createTokenPair).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should answer a soft-deleted user exactly as it answers wrong credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(credentials)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: {
          status: 'error',
          statusCode: HttpStatus.BAD_REQUEST,
          code: ErrorCode.AUTH_INVALID_CREDENTIALS,
          message: 'Invalid email or password',
        },
      });
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
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.refreshTokens('refresh-token');

      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'refresh-token', user: { deletedAt: null } },
        }),
      );
    });

    it('should reject a token whose owner is soft-deleted with a legacy 401', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('refresh-token')).rejects.toThrow(
        V1ApiException,
      );
      expect(mockPrismaService.refreshToken.updateMany).not.toHaveBeenCalled();
      expect(mockPrismaService.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should shape the soft-deleted owner refusal as the legacy error body', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshTokens('refresh-token'),
      ).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: {
          status: 'error',
          statusCode: HttpStatus.UNAUTHORIZED,
          code: ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
          message: 'Invalid or expired refresh token',
        },
      });
    });

    it('should still issue a new pair for a live owner', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refreshTokens('refresh-token');

      expect(result).toEqual({ tokens: tokenPair });
    });
  });
});
