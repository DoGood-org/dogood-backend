import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TokensService } from '@shared/services/tokens.service';
import { CookieService } from '@shared/services/cookie.service';
import { PrismaService } from '@database/prisma.service';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokensService: TokensService,
    private readonly cookieService: CookieService,
    private readonly prismaService: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    const accessToken = this.cookieService.getCookie(request, 'accessToken');

    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }

    try {
      const payload = await this.tokensService.verifyAccessToken(accessToken);

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          isEmailVerified: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (user.status === UserStatus.BANNED) {
        throw new UnauthorizedException('User is banned');
      }

      request['user'] = {
        userId: user.id,
        role: user.role,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
