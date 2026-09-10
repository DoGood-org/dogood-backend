import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '@database/prisma.service';
import { ErrorCode } from '@shared/constants/api-codes';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { isVersionV1Route } from '@shared/guards/route-version';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

/**
 * NOTE: port of the legacy `authenticateUser` middleware
 * (`develop:src/middlewares/auth.middleware.ts:19-56`) — same four answers, same codes.
 * Guards v1 routes only; v2 stays with `AuthGuard` and its Nest-format errors.
 */
@Injectable()
export class AuthGuardV1 implements CanActivate {
  constructor(
    private readonly tokensService: TokensService,
    private readonly cookieService: CookieService,
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!isVersionV1Route(this.reflector, context)) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const accessToken = this.cookieService.getCookie(request, 'accessToken');

    if (!accessToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Authentication required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const userId = await this.resolveUserId(accessToken);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        ban: {
          select: { banType: true, banReason: true, banExpiresAt: true },
        },
      },
    });

    if (!user) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    if (user.status === UserStatus.BANNED) {
      const response = context.switchToHttp().getResponse<Response>();

      this.cookieService.clearAllCookies(response, [
        'accessToken',
        'refreshToken',
      ]);

      throw V1ApiException.banned(user, 'Your account has been suspended');
    }

    if (!user.isEmailVerified) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
      );
    }

    request.user = {
      userId: user.id,
      role: user.role,
    };

    return true;
  }

  private async resolveUserId(accessToken: string): Promise<string> {
    try {
      const payload = await this.tokensService.verifyAccessToken(accessToken);

      return payload.sub;
    } catch {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }
  }
}
