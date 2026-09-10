import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { VERSION_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuthGuard } from '@shared/guards/auth.guard';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

// NOTE: jose ships ESM only and jest does not transform node_modules, so the
// import chain through TokensService has to be stubbed out.
jest.mock('jose', () => ({ SignJWT: jest.fn(), jwtVerify: jest.fn() }));

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockTokensService = {
    verifyAccessToken: jest.fn(),
  };

  const mockCookieService = {
    getCookie: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const liveUser = {
    id: 'user-id',
    email: 'user@example.com',
    role: SiteRole.USER,
    status: UserStatus.ACTIVE,
    isEmailVerified: true,
  };

  // NOTE: test double for ExecutionContext — only the members AuthGuard reads are implemented.
  const createExecutionContext = (request: RequestWithUser): ExecutionContext =>
    ({
      getHandler: (): unknown => undefined,
      getClass: (): unknown => undefined,
      switchToHttp: (): unknown => ({
        getRequest: (): RequestWithUser => request,
      }),
    }) as unknown as ExecutionContext;

  const createRequest = (): RequestWithUser =>
    ({}) as unknown as RequestWithUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokensService, useValue: mockTokensService },
        { provide: CookieService, useValue: mockCookieService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);

    jest.clearAllMocks();

    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockCookieService.getCookie.mockReturnValue('access-token');
    mockTokensService.verifyAccessToken.mockResolvedValue({
      sub: liveUser.id,
      role: liveUser.role,
    });
  });

  it('should look the user up with a deletedAt: null filter', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(liveUser);

    await guard.canActivate(createExecutionContext(createRequest()));

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: liveUser.id, deletedAt: null },
      }),
    );
  });

  it('should let a live user through and attach userId and role to the request', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(liveUser);

    const request = createRequest();
    const canActivate = await guard.canActivate(
      createExecutionContext(request),
    );

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({ userId: liveUser.id, role: liveUser.role });
  });

  it('should reject a soft-deleted user, whom the filtered lookup no longer returns', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(null);

    const request = createRequest();

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).rejects.toThrow(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });

  it('should still reject a banned user', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...liveUser,
      status: UserStatus.BANNED,
    });

    await expect(
      guard.canActivate(createExecutionContext(createRequest())),
    ).rejects.toThrow(new UnauthorizedException('User is banned'));
  });

  it('should still answer 401 in the Nest format when the access token cookie is missing', async () => {
    mockCookieService.getCookie.mockReturnValue(undefined);

    await expect(
      guard.canActivate(createExecutionContext(createRequest())),
    ).rejects.toThrow(new UnauthorizedException('Access token not found'));
  });

  it('should still let a user with an unverified email through, unlike the v1 guard', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      ...liveUser,
      isEmailVerified: false,
    });

    const request = createRequest();

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual({ userId: liveUser.id, role: liveUser.role });
  });

  it('should hand a v1 route over to AuthGuardV1 without resolving the user itself', async () => {
    mockReflector.getAllAndOverride.mockImplementation((key: string) =>
      key === VERSION_METADATA ? '1' : false,
    );

    const request = createRequest();
    const canActivate = await guard.canActivate(
      createExecutionContext(request),
    );

    expect(canActivate).toBe(true);
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('should skip the lookup entirely on a @Public() endpoint', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);

    const canActivate = await guard.canActivate(
      createExecutionContext(createRequest()),
    );

    expect(canActivate).toBe(true);
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });
});
