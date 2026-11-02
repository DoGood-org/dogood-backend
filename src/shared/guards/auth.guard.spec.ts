import {
  Controller,
  ExecutionContext,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SiteRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { AuthV1 } from '@shared/decorators/auth-v1.decorator';
import { Public } from '@shared/decorators/public.decorator';
import { AuthGuard } from '@shared/guards/auth.guard';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

// NOTE: `jose` ships ESM only, which Jest does not transform; the guard gets a mocked TokensService anyway.
jest.mock('@shared/services/tokens.service', () => ({
  TokensService: class {},
}));

@AuthV1()
@Controller()
class LegacyController {
  @Get()
  guarded(this: void): void {}
}

@Controller()
class ModernController {
  @Get()
  guarded(this: void): void {}

  @Public()
  @Get()
  open(this: void): void {}
}

describe('AuthGuard', () => {
  const tokensService = { verifyAccessToken: jest.fn() };
  const cookieService = { getCookie: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new AuthGuard(
    tokensService as unknown as TokensService,
    cookieService as unknown as CookieService,
    prisma as unknown as PrismaService,
    new Reflector(),
  );
  let request: RequestWithUser;

  const contextFor = (
    controller: object,
    handler: (...args: unknown[]) => unknown,
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;
  const modernContext = (): ExecutionContext =>
    contextFor(ModernController, ModernController.prototype.guarded);

  beforeEach(() => {
    jest.resetAllMocks();
    request = {} as RequestWithUser;
    cookieService.getCookie.mockReturnValue('access-token');
    tokensService.verifyAccessToken.mockResolvedValue({
      sub: 'user-1',
      role: SiteRole.USER,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'ann@b.co',
      role: SiteRole.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
    });
  });

  it('should skip an @AuthV1() controller and leave it to AuthV1Guard', async () => {
    await expect(
      guard.canActivate(
        contextFor(LegacyController, LegacyController.prototype.guarded),
      ),
    ).resolves.toBe(true);
    expect(cookieService.getCookie).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('should let a @Public() route through', async () => {
    await expect(
      guard.canActivate(
        contextFor(ModernController, ModernController.prototype.open),
      ),
    ).resolves.toBe(true);
    expect(cookieService.getCookie).not.toHaveBeenCalled();
  });

  it('should authenticate a route without @AuthV1() and set request.user', async () => {
    await expect(guard.canActivate(modernContext())).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1', deletedAt: null } }),
    );
    expect(request.user).toEqual({ userId: 'user-1', role: SiteRole.USER });
  });

  it('should keep answering a banned user with 401 outside v1', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'ann@b.co',
      role: SiteRole.USER,
      status: UserStatus.BANNED,
      isEmailVerified: true,
    });

    await expect(guard.canActivate(modernContext())).rejects.toThrow(
      new UnauthorizedException('User is banned'),
    );
  });
});
