import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

export interface AuthUser {
  id: string;
  siteRole: string;
}

export const User = createParamDecorator(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const authUser: AuthUser = {
      id: user.userId,
      siteRole: user.siteRole,
    };

    return key ? authUser[key] : authUser;
  },
);
