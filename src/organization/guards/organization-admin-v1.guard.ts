import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { V1ApiException } from '@shared/exceptions/v1-api.exception';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

const ADMIN_ONLY_MESSAGE = 'Only ADMIN can manage organization settings';

// NOTE: legacy checks membership first, so a non-member gets 404 and the 403 branch only ever
// reaches a member without the ADMIN role (defect #5, kept as the contract).
@Injectable()
export class OrganizationAdminV1Guard implements CanActivate {
  constructor(
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    const organizationId = typeof params.id === 'string' ? params.id : '';

    if (!user) {
      throw new V1ApiException(
        HttpStatus.UNAUTHORIZED,
        'Unauthorized',
        ErrorCode.AUTH_UNAUTHORIZED,
      );
    }

    const role = await this.organizationAccessService.getOrganizationMemberRole(
      user.userId,
      organizationId,
    );

    if (role === null) {
      throw new V1ApiException(
        HttpStatus.NOT_FOUND,
        'User is not a member of this organization',
        ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION,
      );
    }

    if (role !== OrganizationRole.ADMIN) {
      // NOTE: the legacy 403 carries no machine-readable code.
      throw new V1ApiException(
        HttpStatus.FORBIDDEN,
        ADMIN_ONLY_MESSAGE,
        ErrorCode.MEMBBER_DONT_HAVE_PERMISSION,
        {
          status: 'error',
          statusCode: HttpStatus.FORBIDDEN,
          code: null,
          message: ADMIN_ONLY_MESSAGE,
        },
      );
    }

    return true;
  }
}
