import {
  Controller,
  ExecutionContext,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { BlockType, SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { Public } from '@shared/decorators/public.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { AuthGuardV1 } from '@shared/guards/auth-v1.guard';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

// NOTE: jose ships ESM only and jest does not transform node_modules, so the
// import chain through TokensService has to be stubbed out.
jest.mock('jose', () => ({ SignJWT: jest.fn(), jwtVerify: jest.fn() }));

// NOTE: real controllers stand in for the version metadata Nest reads off the route,
// so the split between the guards is tested through the decorators, not through a mock.
@Controller({ path: 'legacy', version: '1' })
class V1Controller {
  find(): void {}

  @Public()
  findPublic(): void {}
}

@Controller({ path: 'modern', version: '2' })
class V2Controller {
  find(): void {}
}

describe('AuthGuardV1', () => {
  let guard: AuthGuardV1;

  const mockPrismaService = { user: { findUnique: jest.fn() } };
  const mockTokensService = { verifyAccessToken: jest.fn() };
  const mockCookieService = {
    getCookie: jest.fn(),
    clearAllCookies: jest.fn(),
  };

  const liveUser = {
    id: 'user-id',
    role: SiteRole.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ban: null,
  };

  const response = {} as unknown as Response;

  const createRequest = (): RequestWithUser =>
    ({}) as unknown as RequestWithUser;

  // NOTE: test double for ExecutionContext — only the members the guard reads are implemented.
  const createExecutionContext = (
    request: RequestWithUser,
    controller: object = V1Controller,
    handlerName = 'find',
  ): ExecutionContext =>
    ({
      getHandler: (): unknown =>
        (controller as { prototype: Record<string, unknown> }).prototype[
          handlerName
        ],
      getClass: (): unknown => controller,
      switchToHttp: (): unknown => ({
        getRequest: (): RequestWithUser => request,
        getResponse: (): Response => response,
      }),
    }) as unknown as ExecutionContext;

  const getErrorBody = (error: unknown): unknown =>
    (error as V1ApiException).getResponse();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuardV1,
        Reflector,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: CookieService, useValue: mockCookieService },
      ],
    }).compile();

    guard = module.get<AuthGuardV1>(AuthGuardV1);

    jest.clearAllMocks();

    mockCookieService.getCookie.mockReturnValue('access-token');
    mockTokensService.verifyAccessToken.mockResolvedValue({
      sub: liveUser.id,
      role: liveUser.role,
    });
    mockPrismaService.user.findUnique.mockResolvedValue(liveUser);
  });

  it('should ignore a v2 route entirely and leave it to AuthGuard', async () => {
    const request = createRequest();

    const canActivate = await guard.canActivate(
      createExecutionContext(request, V2Controller),
    );

    expect(canActivate).toBe(true);
    expect(mockCookieService.getCookie).not.toHaveBeenCalled();
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('should skip the lookup on a @Public() v1 endpoint', async () => {
    const canActivate = await guard.canActivate(
      createExecutionContext(createRequest(), V1Controller, 'findPublic'),
    );

    expect(canActivate).toBe(true);
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });

  it('should answer the legacy 401 envelope when the access token cookie is missing', async () => {
    mockCookieService.getCookie.mockReturnValue(undefined);

    expect.assertions(2);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect((error as V1ApiException).getStatus()).toBe(
        HttpStatus.UNAUTHORIZED,
      );
      expect(getErrorBody(error)).toEqual({
        status: 'error',
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        message: 'Authentication required',
      });
    }
  });

  it('should answer the legacy 401 envelope when the token does not verify', async () => {
    mockTokensService.verifyAccessToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired access token'),
    );

    expect.assertions(2);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect((error as V1ApiException).getStatus()).toBe(
        HttpStatus.UNAUTHORIZED,
      );
      expect(getErrorBody(error)).toEqual({
        status: 'error',
        statusCode: HttpStatus.UNAUTHORIZED,
        code: ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
        message: 'Invalid or expired token',
      });
    }
  });

  it('should answer 404, not 401, when the token points at no live user', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    expect.assertions(2);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect((error as V1ApiException).getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(getErrorBody(error)).toEqual({
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.USER_NOT_FOUND,
        message: 'User not found',
      });
    }
  });

  it('should look the user up with a deletedAt: null filter', async () => {
    await guard.canActivate(createExecutionContext(createRequest()));

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: liveUser.id, deletedAt: null },
      }),
    );
  });

  it('should answer the legacy 403 ban body from the ban relation and clear both cookies', async () => {
    const banExpiresAt = new Date('2026-12-01T00:00:00.000Z');

    mockPrismaService.user.findUnique.mockResolvedValue({
      ...liveUser,
      status: UserStatus.BANNED,
      ban: {
        banType: BlockType.ONE_WEEK,
        banReason: 'spam',
        banExpiresAt,
      },
    });

    expect.assertions(3);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect((error as V1ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(getErrorBody(error)).toEqual({
        message: 'Your account has been suspended',
        code: ErrorCode.USER_WAS_BANNED,
        bannedUser: {
          accountId: liveUser.id,
          suspendedOn: liveUser.createdAt,
          suspensionType: BlockType.ONE_WEEK,
          reason: 'spam',
          banExpiresAt,
        },
      });
      expect(mockCookieService.clearAllCookies).toHaveBeenCalledWith(response, [
        'accessToken',
        'refreshToken',
      ]);
    }
  });

  it('should fall back to the legacy default reason when the ban carries none', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...liveUser,
      status: UserStatus.BANNED,
      ban: {
        banType: BlockType.PERMANENT,
        banReason: null,
        banExpiresAt: null,
      },
    });

    expect.assertions(1);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect(getErrorBody(error)).toEqual(
        expect.objectContaining({
          bannedUser: expect.objectContaining({
            reason: 'Access restricted due to a community guidelines violation',
            banExpiresAt: null,
          }) as unknown,
        }),
      );
    }
  });

  it('should answer the legacy 403 envelope when the email is not verified', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...liveUser,
      isEmailVerified: false,
    });

    expect.assertions(2);

    try {
      await guard.canActivate(createExecutionContext(createRequest()));
    } catch (error) {
      expect((error as V1ApiException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(getErrorBody(error)).toEqual({
        status: 'error',
        statusCode: HttpStatus.FORBIDDEN,
        code: ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
        message: 'Please verify your email',
      });
    }
  });

  it('should let a live verified user through and attach userId and role to the request', async () => {
    const request = createRequest();

    const canActivate = await guard.canActivate(
      createExecutionContext(request),
    );

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ userId: liveUser.id, role: liveUser.role });
  });
});
