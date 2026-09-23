import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { OrganizationAdminV1Guard } from 'src/organization/guards/organization-admin-v1.guard';
import { OrganizationAccessService } from 'src/organization/services/organization-access.service';

describe('OrganizationAdminV1Guard', () => {
  const getOrganizationMemberRole = jest.fn();
  const organizationAccessService = {
    getOrganizationMemberRole,
  } as unknown as OrganizationAccessService;
  const guard = new OrganizationAdminV1Guard(organizationAccessService);
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { userId: 'user-id', role: 'USER' },
        params: { id: 'organization-id' },
      }),
    }),
  } as unknown as ExecutionContext;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should let an organization admin through', async () => {
    getOrganizationMemberRole.mockResolvedValue(OrganizationRole.ADMIN);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(getOrganizationMemberRole).toHaveBeenCalledWith(
      'user-id',
      'organization-id',
    );
  });

  it('should answer a non-member with the legacy 404 before any role check', async () => {
    getOrganizationMemberRole.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      response: {
        status: 'error',
        statusCode: HttpStatus.NOT_FOUND,
        code: ErrorCode.USER_IS_NOT_MEMBER_OF_ORGANIZATION,
        message: 'User is not a member of this organization',
      },
    });
  });

  it('should answer a non-admin member with a code-less 403', async () => {
    getOrganizationMemberRole.mockResolvedValue(OrganizationRole.MODERATOR);

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: {
        status: 'error',
        statusCode: HttpStatus.FORBIDDEN,
        code: null,
        message: 'Only ADMIN can manage organization settings',
      },
    });
  });
});
