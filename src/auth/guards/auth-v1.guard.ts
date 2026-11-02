import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '@prisma/client';
import { Response } from 'express';
import { ErrorCode } from '@shared/constants/api-codes';
import { IS_AUTH_V1_KEY } from '@shared/decorators/auth-v1.decorator';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { CookieService } from '@shared/services/cookie.service';
import { TokensService } from '@shared/services/tokens.service';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { AuthUserRowV1 } from 'src/auth/interfaces/auth';
import { AuthServiceV1 } from 'src/auth/services/v1/auth.service';

const AUTH_COOKIE_NAMES = ['accessToken', 'refreshToken'];

// NOTE: port of legacy `authenticateUser` (`develop:src/middlewares/auth.middleware.ts`), check order kept.
// Acts only on `@AuthV1()` controllers; the global `AuthGuard` skips them.
@Injectable()
export class AuthV1Guard implements CanActivate {
  constructor(
    private readonly authService: AuthServiceV1,
    private readonly tokensService: TokensService,
    private readonly cookieService: CookieService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isAuthV1 = this.reflector.getAllAndOverride<boolean>(
      IS_AUTH_V1_KEY,
      targets,
    );
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      targets,
    );

    if (!isAuthV1 || isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithUser>();
    const accessToken = this.cookieService.getCookie(request, 'accessToken');

    if (!accessToken) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Authentication required',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }

    const user = await this.findAuthUserByAccessToken(accessToken);

    if (user === null) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User not found',
        ErrorCode.USER_NOT_FOUND,
      );
    }

    if (user.status === UserStatus.BANNED) {
      this.cookieService.clearAllCookies(
        http.getResponse<Response>(),
        AUTH_COOKIE_NAMES,
      );

      throw V1ApiException.suspended(user);
    }

    if (!user.isEmailVerified) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'Please verify your email',
        ErrorCode.AUTH_EMAIL_NOT_VERIFIED,
      );
    }

    request.user = { userId: user.id, role: user.role };

    return true;
  }

  // NOTE: legacy wraps both the token check and the user lookup in one catch, so a DB failure is a 401 too.
  private async findAuthUserByAccessToken(
    accessToken: string,
  ): Promise<AuthUserRowV1 | null> {
    try {
      const { sub } = await this.tokensService.verifyAccessToken(accessToken);

      return await this.authService.findAuthUser(sub);
    } catch {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Invalid or expired token',
        ErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      );
    }
  }
}
