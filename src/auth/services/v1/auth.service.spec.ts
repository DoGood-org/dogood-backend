import { HttpStatus } from '@nestjs/common';
import { BlockType, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode, SuccessCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { EmailService } from '@shared/services/email.service';
import { HashService } from '@shared/services/hash.service';
import { TokensService } from '@shared/services/tokens.service';
import { LoginUserRowV1, UserBanRowV1 } from 'src/auth/interfaces/auth';
import { AuthMapperV1 } from 'src/auth/mappers/v1/auth.mapper';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';
import { I18nService } from 'src/i18n/services/i18n.service';
import { translations } from 'src/i18n/translations';
import { UserServiceV1 } from 'src/user/services/v1/user.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the service gets a mocked TokensService anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

const HEX_CODE = /^[0-9a-f]{64}$/;
const MINUTE_MS = 60 * 1000;

const catchV1Exception = async (
  promise: Promise<unknown>,
): Promise<V1ApiException> => {
  const error: unknown = await promise.catch((e: unknown) => e);

  expect(error).toBeInstanceOf(V1ApiException);

  return error as V1ApiException;
};

describe('AuthServiceV1', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userSettings: { create: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const tokensService = {
    createTokenPair: jest.fn(),
    verifyRefreshToken: jest.fn(),
    getRefreshTokenExpiresInMs: jest.fn(),
  };
  const hashService = { hashPassword: jest.fn(), verifyPassword: jest.fn() };
  const emailService = { sendEmail: jest.fn() };
  const userService = { getFullUser: jest.fn() };
  const service = new AuthServiceV1(
    prisma as unknown as PrismaService,
    tokensService as unknown as TokensService,
    hashService as unknown as HashService,
    emailService as unknown as EmailService,
    new I18nService(),
    userService as unknown as UserServiceV1,
    new AuthMapperV1(),
  );
  const now = new Date('2026-10-16T12:00:00Z');
  const refreshTtlMs = 7 * 24 * 60 * MINUTE_MS;
  const tokens = { accessToken: 'access-2', refreshToken: 'refresh-2' };
  const client = { ip: '1.2.3.4', userAgent: 'agent' };
  const createdAt = new Date('2026-01-01T00:00:00Z');
  const loginUser: LoginUserRowV1 = {
    id: 'user-1',
    email: 'ann@b.co',
    name: 'Ann',
    role: SiteRole.USER,
    password: 'hashed',
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt,
    ban: null,
    userProfile: null,
    userSettings: { theme: 'dark', language: 'de' },
  };
  const loginData = { email: 'ann@b.co', password: 'secret1' };

  const expectV1Error = (
    error: V1ApiException,
    statusCode: HttpStatus,
    message: string,
    code: ErrorCode | null,
  ): void => {
    expect(error.getStatus()).toBe(statusCode);
    expect(error.getResponse()).toEqual({
      status: 'error',
      statusCode,
      code,
      message,
    });
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers({ now });
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    tokensService.createTokenPair.mockResolvedValue(tokens);
    tokensService.getRefreshTokenExpiresInMs.mockReturnValue(refreshTtlMs);
    emailService.sendEmail.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('signup', () => {
    const signupData = { name: 'Ann', email: 'ann@b.co', password: 'secret1' };

    it('should answer 409 USER_ALREADY_EXISTS when the email is taken, even by a soft-deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const error = await catchV1Exception(service.signup(signupData));

      expectV1Error(
        error,
        HttpStatus.CONFLICT,
        'User already exists',
        ErrorCode.USER_ALREADY_EXISTS,
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'ann@b.co' },
        select: { id: true },
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should create an unverified USER with a 64-hex code valid for 10 minutes', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });
      hashService.hashPassword.mockResolvedValue('hashed');

      await service.signup(signupData);

      expect(hashService.hashPassword).toHaveBeenCalledWith('secret1');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Ann',
          email: 'ann@b.co',
          password: 'hashed',
          role: SiteRole.USER,
          isEmailVerified: false,
          emailVerificationCode: expect.stringMatching(HEX_CODE),
          emailVerificationExpiresAt: new Date(now.getTime() + 10 * MINUTE_MS),
        },
        select: { id: true },
      });
    });

    it('should store the settings language as en whatever ?lang= says (legacy never passed it)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await service.signup(signupData, 'de');

      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', language: 'en' },
        select: { id: true },
      });
    });

    it('should mail the code in the ?lang= language with the localized verify link', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await service.signup(signupData, 'de');

      const [{ data }] = prisma.user.create.mock.calls[0] as [
        { data: { emailVerificationCode: string } },
      ];
      const { emailVerificationCode } = data;

      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'ann@b.co',
        subject: translations.de.email.verification.subject,
        html: expect.stringContaining(`/de/verify/${emailVerificationCode}`),
      });
    });

    it.each([undefined, 'fr', 'de-DE'])(
      'should fall back to en for ?lang=%p (exact match only)',
      async (lang) => {
        prisma.user.findUnique.mockResolvedValue(null);
        prisma.user.create.mockResolvedValue({ id: 'user-1' });

        await service.signup(signupData, lang);

        expect(emailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: translations.en.email.verification.subject,
            html: expect.stringContaining('/en/verify/'),
          }),
        );
      },
    );

    it('should answer the legacy USER_REGISTERED envelope', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1' });

      await expect(service.signup(signupData)).resolves.toEqual({
        status: 'success',
        code: SuccessCode.USER_REGISTERED,
        message: 'User created. Please check your email to verify.',
      });
    });
  });

  describe('login', () => {
    const bannedUser = (ban: UserBanRowV1 | null): LoginUserRowV1 => ({
      ...loginUser,
      status: UserStatus.BANNED,
      ban,
    });

    it('should look the user up by email among live users only', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await catchV1Exception(service.login(loginData, client));

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'ann@b.co', deletedAt: null },
        }),
      );
    });

    it('should answer 400 AUTH_INVALID_CREDENTIALS for an unknown email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(service.login(loginData, client));

      expectV1Error(
        error,
        HttpStatus.BAD_REQUEST,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    });

    it('should answer 403 with the bannedUser payload for a permanent ban, before checking the password', async () => {
      prisma.user.findFirst.mockResolvedValue(
        bannedUser({
          banType: BlockType.PERMANENT,
          banReason: 'Spam',
          banExpiresAt: null,
        }),
      );

      const error = await catchV1Exception(service.login(loginData, client));

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.getResponse()).toEqual({
        message: 'Access denied. Account suspended.',
        code: ErrorCode.USER_WAS_BANNED,
        bannedUser: {
          accountId: 'user-1',
          suspendedOn: createdAt,
          suspensionType: BlockType.PERMANENT,
          reason: 'Spam',
          banExpiresAt: null,
        },
      });
      expect(hashService.verifyPassword).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should keep a temporary ban that has not expired yet', async () => {
      prisma.user.findFirst.mockResolvedValue(
        bannedUser({
          banType: BlockType.ONE_WEEK,
          banReason: null,
          banExpiresAt: new Date(now.getTime() + MINUTE_MS),
        }),
      );

      const error = await catchV1Exception(service.login(loginData, client));

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should keep a ban that expires exactly now (legacy lifts it only strictly after)', async () => {
      prisma.user.findFirst.mockResolvedValue(
        bannedUser({
          banType: BlockType.CUSTOM,
          banReason: null,
          banExpiresAt: now,
        }),
      );

      const error = await catchV1Exception(service.login(loginData, client));

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    });

    it('should treat a BANNED status without a ban row as banned', async () => {
      prisma.user.findFirst.mockResolvedValue(bannedUser(null));

      const error = await catchV1Exception(service.login(loginData, client));

      expect(error.getResponse()).toMatchObject({
        bannedUser: { suspensionType: null, banExpiresAt: null },
      });
    });

    it.each([null, ''])(
      'should fall back to the default ban reason for %p',
      async (banReason) => {
        prisma.user.findFirst.mockResolvedValue(
          bannedUser({
            banType: BlockType.PERMANENT,
            banReason,
            banExpiresAt: null,
          }),
        );

        const error = await catchV1Exception(
          service.login(loginData, client),
        );

        expect(error.getResponse()).toMatchObject({
          bannedUser: {
            reason: 'Access restricted due to a community guidelines violation',
          },
        });
      },
    );

    it('should lift an expired temporary ban and let the login through', async () => {
      prisma.user.findFirst.mockResolvedValue(
        bannedUser({
          banType: BlockType.THREE_DAYS,
          banReason: null,
          banExpiresAt: new Date(now.getTime() - 1),
        }),
      );
      hashService.verifyPassword.mockResolvedValue(true);

      const result = await service.login(loginData, client);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.ACTIVE, ban: { delete: true } },
        select: { id: true },
      });
      expect(result.session.accessToken).toBe('access-2');
    });

    it('should answer 403 AUTH_EMAIL_NOT_VERIFIED before checking the password', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...loginUser,
        isEmailVerified: false,
      });

      const error = await catchV1Exception(service.login(loginData, client));

      expectV1Error(
        error,
        HttpStatus.FORBIDDEN,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
      );
      expect(hashService.verifyPassword).not.toHaveBeenCalled();
    });

    it('should answer 400 AUTH_INVALID_CREDENTIALS for a wrong password and issue no tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(loginUser);
      hashService.verifyPassword.mockResolvedValue(false);

      const error = await catchV1Exception(service.login(loginData, client));

      expectV1Error(
        error,
        HttpStatus.BAD_REQUEST,
        'Invalid email or password',
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
      expect(hashService.verifyPassword).toHaveBeenCalledWith(
        'secret1',
        'hashed',
      );
      expect(tokensService.createTokenPair).not.toHaveBeenCalled();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should persist the refresh token as a new session row with the client data', async () => {
      prisma.user.findFirst.mockResolvedValue(loginUser);
      hashService.verifyPassword.mockResolvedValue(true);

      await service.login(loginData, client);

      expect(tokensService.createTokenPair).toHaveBeenCalledWith({
        sub: 'user-1',
        role: SiteRole.USER,
      });
      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          token: 'refresh-2',
          userId: 'user-1',
          ip: '1.2.3.4',
          userAgent: 'agent',
          expiresAt: new Date(now.getTime() + refreshTtlMs),
        },
        select: { id: true },
      });
    });

    it('should clean up expired revoked refresh tokens after saving the new one', async () => {
      prisma.user.findFirst.mockResolvedValue(loginUser);
      hashService.verifyPassword.mockResolvedValue(true);

      await service.login(loginData, client);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { expiresAt: { lt: now }, revokedAt: { not: null } },
      });
      const [createOrder] = prisma.refreshToken.create.mock.invocationCallOrder;
      const [cleanupOrder] =
        prisma.refreshToken.deleteMany.mock.invocationCallOrder;

      expect(createOrder).toBeLessThan(cleanupOrder);
    });

    it('should answer the legacy user shape and a session with the refresh TTL', async () => {
      prisma.user.findFirst.mockResolvedValue(loginUser);
      hashService.verifyPassword.mockResolvedValue(true);

      await expect(service.login(loginData, client)).resolves.toEqual({
        response: {
          message: 'User logged in successfully',
          code: SuccessCode.USER_LOGGED_IN,
          user: {
            id: 'user-1',
            name: 'Ann',
            email: 'ann@b.co',
            avatar: null,
            siteRole: SiteRole.USER,
            settings: { theme: 'dark', language: 'de' },
            profile: null,
          },
        },
        session: {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          refreshTokenMaxAgeMs: refreshTtlMs,
        },
      });
    });
  });

  describe('logout', () => {
    it('should answer 400 when there is no refresh token cookie', async () => {
      const error = await catchV1Exception(service.logout(undefined));

      expectV1Error(
        error,
        HttpStatus.BAD_REQUEST,
        'No refresh token provided',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    });

    it('should answer 401 with code null for a token with a bad signature, revoking nothing', async () => {
      tokensService.verifyRefreshToken.mockRejectedValue(new Error('bad'));

      const error = await catchV1Exception(service.logout('broken'));

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired token',
        null,
      );
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should revoke every live session of the user (legacy logout is global)', async () => {
      tokensService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        role: SiteRole.USER,
      });

      await service.logout('refresh-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: now },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should filter the code by expiry and live users in the query', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await catchV1Exception(service.verifyEmail('code-1'));

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          emailVerificationCode: 'code-1',
          emailVerificationExpiresAt: { gte: now },
          deletedAt: null,
        },
        select: { id: true, isEmailVerified: true },
      });
    });

    it('should answer 400 EMAIL_VERIFICATION_INVALID for an unknown or expired code', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(service.verifyEmail('code-1'));

      expectV1Error(
        error,
        HttpStatus.BAD_REQUEST,
        'Invalid verification code',
        ErrorCode.EMAIL_VERIFICATION_INVALID,
      );
    });

    it('should answer EMAIL_ALREADY_VERIFIED without writing for an already verified user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        isEmailVerified: true,
      });

      await expect(service.verifyEmail('code-1')).resolves.toEqual({
        status: 'success',
        code: SuccessCode.EMAIL_ALREADY_VERIFIED,
        message: 'Email already verified',
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should mark the email verified and clear the code', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        isEmailVerified: false,
      });

      await expect(service.verifyEmail('code-1')).resolves.toEqual({
        status: 'success',
        code: SuccessCode.EMAIL_VERIFICATION_SUCCESS,
        message: 'Email successfully verified',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isEmailVerified: true,
          emailVerificationCode: null,
          emailVerificationExpiresAt: null,
        },
        select: { id: true },
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('should answer 404 USER_NOT_FOUND for an unknown email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(
        service.resendVerificationEmail({ email: 'ann@b.co' }),
      );

      expectV1Error(
        error,
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'ann@b.co', deletedAt: null },
        select: { id: true, email: true, isEmailVerified: true },
      });
    });

    it('should answer EMAIL_ALREADY_VERIFIED without a new code or email', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'ann@b.co',
        isEmailVerified: true,
      });

      await expect(
        service.resendVerificationEmail({ email: 'ann@b.co' }),
      ).resolves.toEqual({
        message: 'Email already verified',
        code: SuccessCode.EMAIL_ALREADY_VERIFIED,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should store a fresh 64-hex code valid for 15 minutes and mail it', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'ann@b.co',
        isEmailVerified: false,
      });

      await expect(
        service.resendVerificationEmail({ email: 'ann@b.co' }, 'uk'),
      ).resolves.toEqual({
        message: 'Verification email resent. Please check your inbox.',
        code: SuccessCode.EMAIL_RESEND_SUCCESS,
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          emailVerificationCode: expect.stringMatching(HEX_CODE),
          emailVerificationExpiresAt: new Date(now.getTime() + 15 * MINUTE_MS),
        },
        select: { id: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'ann@b.co',
          subject: translations.uk.email.verification.subject,
          html: expect.stringContaining('/uk/verify/'),
        }),
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should answer the full legacy user in the USER_DATA_RETRIEVED envelope', async () => {
      const fullUser = { id: 'user-1' };
      userService.getFullUser.mockResolvedValue(fullUser);

      await expect(service.getCurrentUser('user-1')).resolves.toEqual({
        status: 'success',
        message: 'User data retrieved',
        code: SuccessCode.USER_DATA_RETRIEVED,
        user: fullUser,
      });
      expect(userService.getFullUser).toHaveBeenCalledWith('user-1');
    });

    it('should answer user: null when the user vanished (legacy sanitizeUser(null))', async () => {
      userService.getFullUser.mockResolvedValue(null);

      await expect(service.getCurrentUser('user-1')).resolves.toMatchObject({
        user: null,
      });
    });
  });

  describe('refreshTokens', () => {
    const storedToken = {
      id: 'session-1',
      expiresAt: new Date(now.getTime() + MINUTE_MS),
      revokedAt: null,
      updatedAt: createdAt,
    };
    const tokenOwner = {
      id: 'user-1',
      role: SiteRole.ADMIN,
      status: UserStatus.ACTIVE,
      createdAt,
      ban: null,
    };

    beforeEach(() => {
      tokensService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        role: SiteRole.USER,
      });
    });

    it('should answer 401 "Refresh token required" without a cookie', async () => {
      const error = await catchV1Exception(
        service.refreshTokens(undefined, client),
      );

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Refresh token required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    });

    it('should answer 401 with code null for a token with a bad signature', async () => {
      tokensService.verifyRefreshToken.mockRejectedValue(new Error('bad'));

      const error = await catchV1Exception(
        service.refreshTokens('broken', client),
      );

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired token',
        null,
      );
      expect(prisma.refreshToken.findFirst).not.toHaveBeenCalled();
    });

    it('should answer 401 "Token not found" when the token is not a session of that user', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(
        service.refreshTokens('refresh-1', client),
      );

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Token not found',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'refresh-1' },
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          updatedAt: true,
        },
      });
    });

    it('should answer 401 "Refresh token expired" for an expired session', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(now.getTime() - 1),
      });

      const error = await catchV1Exception(
        service.refreshTokens('refresh-1', client),
      );

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Refresh token expired',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    });

    it('should answer "Tokens already refreshed" without cookies for a token revoked under 15 s ago', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        ...storedToken,
        revokedAt: now,
        updatedAt: new Date(now.getTime() - 14_999),
      });

      await expect(
        service.refreshTokens('refresh-1', client),
      ).resolves.toEqual({
        response: {
          message: 'Tokens already refreshed',
          code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
        },
        session: null,
      });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('should answer 401 for a token revoked 15 s ago or earlier (reuse)', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        ...storedToken,
        revokedAt: now,
        updatedAt: new Date(now.getTime() - 15_000),
      });

      const error = await catchV1Exception(
        service.refreshTokens('refresh-1', client),
      );

      expectV1Error(
        error,
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired refresh token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    });

    it('should answer 404 USER_NOT_FOUND when the owner is deleted', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(
        service.refreshTokens('refresh-1', client),
      );

      expectV1Error(
        error,
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1', deletedAt: null } }),
      );
    });

    it('should answer 403 bannedUser for a banned owner and keep the session row', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findFirst.mockResolvedValue({
        ...tokenOwner,
        status: UserStatus.BANNED,
        ban: {
          banType: BlockType.PERMANENT,
          banReason: 'Spam',
          banExpiresAt: null,
        },
      });

      const error = await catchV1Exception(
        service.refreshTokens('refresh-1', client),
      );

      expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(error.getResponse()).toMatchObject({
        code: ErrorCode.USER_WAS_BANNED,
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('should lift an expired temporary ban and rotate', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findFirst.mockResolvedValue({
        ...tokenOwner,
        status: UserStatus.BANNED,
        ban: {
          banType: BlockType.ONE_MONTH,
          banReason: null,
          banExpiresAt: new Date(now.getTime() - 1),
        },
      });
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.refreshTokens('refresh-1', client);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: UserStatus.ACTIVE, ban: { delete: true } },
        select: { id: true },
      });
      expect(result.session).not.toBeNull();
    });

    it('should rotate the session row in place with the owner current role', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findFirst.mockResolvedValue(tokenOwner);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.refreshTokens('refresh-1', client),
      ).resolves.toEqual({
        response: {
          message: 'Tokens refreshed successfully',
          code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
        },
        session: {
          accessToken: 'access-2',
          refreshToken: 'refresh-2',
          refreshTokenMaxAgeMs: refreshTtlMs,
        },
      });
      expect(tokensService.createTokenPair).toHaveBeenCalledWith({
        sub: 'user-1',
        role: SiteRole.ADMIN,
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', token: 'refresh-1', revokedAt: null },
        data: {
          token: 'refresh-2',
          ip: '1.2.3.4',
          userAgent: 'agent',
          expiresAt: new Date(now.getTime() + refreshTtlMs),
        },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it('should answer "Tokens already refreshed" without cookies when a parallel request rotated first', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findFirst.mockResolvedValue(tokenOwner);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.refreshTokens('refresh-1', client),
      ).resolves.toEqual({
        response: {
          message: 'Tokens already refreshed',
          code: SuccessCode.AUTH_TOKEN_REFRESHED_SUCCESSFULY,
        },
        session: null,
      });
    });
  });

  describe.each([
    ['forgotPassword', 'Reset password email sent, check your inbox'],
    ['resendResetPassword', 'Reset password email resent, check your inbox'],
  ] as const)('%s', (method, message) => {
    it('should answer 404 USER_NOT_FOUND for an unknown email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(
        service[method]({ email: 'ann@b.co' }),
      );

      expectV1Error(
        error,
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'ann@b.co', deletedAt: null },
        select: { id: true, email: true },
      });
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });

    it('should store a 64-hex reset token valid for 15 minutes and mail its link', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        email: 'ann@b.co',
      });

      await expect(
        service[method]({ email: 'ann@b.co' }, 'de'),
      ).resolves.toEqual({
        message,
        code: SuccessCode.PASSWORD_RESET_EMAIL_SENT,
      });

      const [{ data }] = prisma.user.update.mock.calls[0] as [
        { data: { resetPasswordToken: string } },
      ];
      const { resetPasswordToken } = data;

      expect(resetPasswordToken).toMatch(HEX_CODE);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          resetPasswordToken,
          resetPasswordExpiresAt: new Date(now.getTime() + 15 * MINUTE_MS),
        },
        select: { id: true },
      });
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'ann@b.co',
        subject: translations.de.email.resetPassword.subject,
        html: expect.stringContaining(`/reset-password/${resetPasswordToken}`),
      });
    });
  });

  describe('resetPassword', () => {
    it.each(['', '   '])(
      'should answer 400 "Reset token is required" for %p without touching the DB',
      async (token) => {
        const error = await catchV1Exception(
          service.resetPassword(token, { password: 'secret1' }),
        );

        expectV1Error(
          error,
          HttpStatus.BAD_REQUEST,
          'Reset token is required',
          ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
        );
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
      },
    );

    it('should answer 400 "Invalid reset code" for an unknown or expired token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const error = await catchV1Exception(
        service.resetPassword('token-1', { password: 'secret1' }),
      );

      expectV1Error(
        error,
        HttpStatus.BAD_REQUEST,
        'Invalid reset code',
        ErrorCode.PASSWORD_RESET_TOKEN_INVALID,
      );
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetPasswordToken: 'token-1',
          resetPasswordExpiresAt: { gte: now },
          deletedAt: null,
        },
        select: { id: true },
      });
    });

    it('should store the new hash and burn the token, leaving sessions alone', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      hashService.hashPassword.mockResolvedValue('new-hash');

      await expect(
        service.resetPassword('token-1', { password: 'secret1' }),
      ).resolves.toEqual({
        message: 'Password has been reset successfully',
        code: SuccessCode.PASSWORD_CHANGED,
      });
      expect(hashService.hashPassword).toHaveBeenCalledWith('secret1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          password: 'new-hash',
          resetPasswordToken: null,
          resetPasswordExpiresAt: null,
        },
        select: { id: true },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
