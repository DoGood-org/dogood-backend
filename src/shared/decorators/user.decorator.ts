import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface AuthUser {
  id: string;
  role: string;
}

export const User = createParamDecorator(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = request.user as { userId: string; role: string };

    if (!user) {
      throw new UnauthorizedException();
    }

    const authUser: AuthUser = {
      id: user.userId,
      role: user.role,
    };

    return key ? authUser[key] : authUser;
  },
);
