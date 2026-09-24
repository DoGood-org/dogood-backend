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

const ADMINS_ONLY_MESSAGE = 'Access denied. Admins only.';

// NOTE: legacy answered this 403 without a machine-readable code.
@Injectable()
export class ReviewAdminV1Guard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (user?.role !== SiteRole.ADMIN) {
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        ADMINS_ONLY_MESSAGE,
        ErrorCode.FORBIDDEN,
        {
          status: 'error',
          statusCode: HttpStatus.FORBIDDEN,
          code: null,
          message: ADMINS_ONLY_MESSAGE,
        },
      );
    }

    return true;
  }
}
