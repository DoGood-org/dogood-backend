import { ResetPasswordRequestDtoV1 } from 'src/auth/dtos/requests/v1/reset-password-request.dto';

describe('ResetPasswordRequestDtoV1', () => {
  it('should accept a 6-char password without a complexity rule', () => {
    expect(
      ResetPasswordRequestDtoV1.schema.safeParse({ password: 'abcdef' })
        .success,
    ).toBe(true);
  });

  it.each([{ password: 'abcde' }, {}])('should reject %p', (body) => {
    expect(ResetPasswordRequestDtoV1.schema.safeParse(body).success).toBe(
      false,
    );
  });
});
