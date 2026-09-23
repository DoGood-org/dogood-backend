import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { SiteRole } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { RequestWithUser } from '@shared/types/request-with-user.interface';

@Injectable()
export class SiteAdminV1Guard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (user?.role !== SiteRole.ADMIN) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        'Forbidden: Admin access required',
        ErrorCode.FORBIDDEN,
      );
    }

    return true;
  }
}
