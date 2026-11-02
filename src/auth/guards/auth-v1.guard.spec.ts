import { Controller, ExecutionContext, Get, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BlockType, SiteRole, UserStatus } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { AuthV1Guard } from 'src/auth/guards/auth-v1.guard';
import { AuthUserRowV1 } from 'src/auth/interfaces/auth';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';

// NOTE: `jose` ships ESM only, which Jest does not transform; the guard gets a mocked TokensService anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

@AuthV1()
@Controller()
class LegacyController {
  @Get()
  guarded(this: void): void {}

  @Public()
  @Get()
  open(this: void): void {}
}

@Controller()
class ModernController {
  @Get()
  guarded(this: void): void {}
}

describe('AuthV1Guard', () => {
  const authService = { findAuthUser: jest.fn() };
  const tokensService = { verifyAccessToken: jest.fn() };
  const cookieService = { getCookie: jest.fn(), clearAllCookies: jest.fn() };
  const guard = new AuthV1Guard(
    authService as unknown as AuthServiceV1,
    tokensService as unknown as TokensService,
    cookieService as unknown as CookieService,
    new Reflector(),
  );
  const now = new Date('2026-11-02T12:00:00Z');
  const activeUser: AuthUserRowV1 = {
    id: 'user-1',
    role: SiteRole.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    ban: null,
  };
  let request: RequestWithUser;
  const response = { marker: 'response' };

  const contextFor = (
    controller: object,
    handler: (...args: unknown[]) => unknown,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;
  const legacyContext = (): ExecutionContext =>
    contextFor(LegacyController, LegacyController.prototype.guarded);

  const catchV1Exception = async (
    promise: Promise<unknown>,
  ): Promise<V1ApiException> => {
    const error: unknown = await promise.catch((e: unknown) => e);

    expect(error).toBeInstanceOf(V1ApiException);

    return error as V1ApiException;
  };

  const expectV1Error = (
    error: V1ApiException,
    statusCode: HttpStatus,
    message: string,
    code: ErrorCode,
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
    request = {} as RequestWithUser;
    cookieService.getCookie.mockReturnValue('access-token');
    tokensService.verifyAccessToken.mockResolvedValue({
      sub: 'user-1',
      role: SiteRole.USER,
    });
    authService.findAuthUser.mockResolvedValue(activeUser);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should leave a controller without @AuthV1() to the global AuthGuard', async () => {
    await expect(
      guard.canActivate(
        contextFor(ModernController, ModernController.prototype.guarded),
      ),
    ).resolves.toBe(true);
    expect(cookieService.getCookie).not.toHaveBeenCalled();
  });

  it('should let a @Public() route of an @AuthV1() controller through', async () => {
    await expect(
      guard.canActivate(
        contextFor(LegacyController, LegacyController.prototype.open),
      ),
    ).resolves.toBe(true);
    expect(cookieService.getCookie).not.toHaveBeenCalled();
  });

  it('should set request.user like the global AuthGuard for a verified active user', async () => {
    await expect(guard.canActivate(legacyContext())).resolves.toBe(true);
    expect(cookieService.getCookie).toHaveBeenCalledWith(
      request,
      'accessToken',
    );
    expect(tokensService.verifyAccessToken).toHaveBeenCalledWith(
      'access-token',
    );
    expect(authService.findAuthUser).toHaveBeenCalledWith('user-1');
    expect(request.user).toEqual({ userId: 'user-1', role: SiteRole.USER });
  });

  it('should answer 401 AUTH_REFRESH_TOKEN_INVALID without an access token cookie', async () => {
    cookieService.getCookie.mockReturnValue(undefined);

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expectV1Error(
      error,
      HttpStatus.UNAUTHORIZED,
      'Authentication required',
      ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
    );
    expect(tokensService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('should answer 401 Invalid or expired token for a bad JWT', async () => {
    tokensService.verifyAccessToken.mockRejectedValue(new Error('bad jwt'));

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expectV1Error(
      error,
      HttpStatus.UNAUTHORIZED,
      'Invalid or expired token',
      ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
    );
    expect(authService.findAuthUser).not.toHaveBeenCalled();
  });

  it('should answer 401 Invalid or expired token when the user lookup fails (legacy catch-all)', async () => {
    authService.findAuthUser.mockRejectedValue(new Error('db down'));

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expectV1Error(
      error,
      HttpStatus.UNAUTHORIZED,
      'Invalid or expired token',
      ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
    );
  });

  it('should answer 404 USER_NOT_FOUND for a missing or soft-deleted user', async () => {
    authService.findAuthUser.mockResolvedValue(null);

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expectV1Error(
      error,
      HttpStatus.NOT_FOUND,
      'User not found',
      ErrorCode.USER_NOT_FOUND,
    );
  });

  it('should answer the legacy 403 suspension body and clear both auth cookies for a banned user', async () => {
    const banExpiresAt = new Date('2026-12-01T00:00:00Z');
    authService.findAuthUser.mockResolvedValue({
      ...activeUser,
      status: UserStatus.BANNED,
      ban: { banType: BlockType.ONE_MONTH, banReason: 'spam', banExpiresAt },
    });

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expect(error.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(error.getResponse()).toEqual({
      message: 'Your account has been suspended',
      code: ErrorCode.USER_WAS_BANNED,
      bannedUser: {
        accountId: 'user-1',
        suspendedOn: now,
        suspensionType: BlockType.ONE_MONTH,
        reason: 'spam',
        banExpiresAt,
      },
    });
    expect(cookieService.clearAllCookies).toHaveBeenCalledWith(response, [
      'accessToken',
      'refreshToken',
    ]);
    expect(request.user).toBeUndefined();
  });

  it('should fall back to the default reason and nulls when the ban row is missing or empty', async () => {
    authService.findAuthUser.mockResolvedValue({
      ...activeUser,
      status: UserStatus.BANNED,
      ban: null,
    });

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expect(error.getResponse()).toMatchObject({
      bannedUser: {
        suspensionType: null,
        reason: 'Access restricted due to a community guidelines violation',
        banExpiresAt: null,
      },
    });
  });

  it('should check the ban before the email verification (legacy order)', async () => {
    authService.findAuthUser.mockResolvedValue({
      ...activeUser,
      status: UserStatus.BANNED,
      isEmailVerified: false,
    });

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expect(error.getResponse()).toMatchObject({
      code: ErrorCode.USER_WAS_BANNED,
    });
  });

  it('should answer 403 AUTH_EMAIL_NOT_VERIFIED for an unverified user', async () => {
    authService.findAuthUser.mockResolvedValue({
      ...activeUser,
      isEmailVerified: false,
    });

    const error = await catchV1Exception(guard.canActivate(legacyContext()));

    expectV1Error(
      error,
      HttpStatus.FORBIDDEN,
      'Please verify your email',
      ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
    );
    expect(cookieService.clearAllCookies).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });
});
