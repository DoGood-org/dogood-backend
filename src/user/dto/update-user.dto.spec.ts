import { SiteRole } from '@prisma/client';
import { updateUserSchema } from 'src/user/dto/update-user.dto';

describe('updateUserSchema', () => {
  it('should drop role so a user cannot promote themselves', () => {
    expect(
      updateUserSchema.parse({ name: 'Mark', role: SiteRole.ADMIN }),
    ).toEqual({ name: 'Mark' });
  });

  it('should require currentPassword to change the password', () => {
    const body = { password: 'NewPassw0rd' };

    expect(updateUserSchema.safeParse(body).success).toBe(false);
    expect(
      updateUserSchema.safeParse({ ...body, currentPassword: 'OldPassw0rd' })
        .success,
    ).toBe(true);
  });

  it('should reject a password weaker than registration allows', () => {
    expect(
      updateUserSchema.safeParse({
        password: 'weakpassword',
        currentPassword: 'OldPassw0rd',
      }).success,
    ).toBe(false);
  });
});
