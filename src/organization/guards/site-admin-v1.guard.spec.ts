import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { SiteRole } from '@prisma/client';
import { ErrorCode } from '@shared/constants/api-codes';
import { SiteAdminV1Guard } from 'src/organization/guards/site-admin-v1.guard';

describe('SiteAdminV1Guard', () => {
  const guard = new SiteAdminV1Guard();
  const contextFor = (role: SiteRole): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'user-id', role } }),
      }),
    }) as unknown as ExecutionContext;

  it('should let a site admin through', () => {
    expect(guard.canActivate(contextFor(SiteRole.ADMIN))).toBe(true);
  });

  it('should answer a regular user with the legacy 403 envelope', () => {
    expect(() => guard.canActivate(contextFor(SiteRole.USER))).toThrow(
      expect.objectContaining({
        status: HttpStatus.FORBIDDEN,
        response: {
          status: 'error',
          statusCode: HttpStatus.FORBIDDEN,
          code: ErrorCode.FORBIDDEN,
          message: 'Forbidden: Admin access required',
        },
      }),
    );
  });
});
