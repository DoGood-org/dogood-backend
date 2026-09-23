import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithUser } from '@shared/types/request-with-user.interface';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

@Injectable()
export class OrganizationAdminV2Guard implements CanActivate {
  constructor(
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, params } = request;
    const organizationId = typeof params.id === 'string' ? params.id : '';

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const isAdmin = await this.organizationAccessService.isOrganizationAdmin(
      user.userId,
      organizationId,
    );

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only ADMIN can manage organization settings',
      );
    }

    return true;
  }
}
