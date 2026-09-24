import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { SiteRole } from '@prisma/client';
import { ReviewAdminV1Guard } from 'src/review/guards/review-admin-v1.guard';

describe('ReviewAdminV1Guard', () => {
  const guard = new ReviewAdminV1Guard();
  const contextFor = (role: SiteRole): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'user-id', role } }),
      }),
    }) as unknown as ExecutionContext;

  it('should let a site admin through', () => {
    expect(guard.canActivate(contextFor(SiteRole.ADMIN))).toBe(true);
  });

  it('should answer a regular user with the codeless legacy 403', () => {
    expect(() => guard.canActivate(contextFor(SiteRole.USER))).toThrow(
      expect.objectContaining({
        status: HttpStatus.FORBIDDEN,
        response: {
          status: 'error',
          statusCode: HttpStatus.FORBIDDEN,
          code: null,
          message: 'Access denied. Admins only.',
        },
      }),
    );
  });
});
