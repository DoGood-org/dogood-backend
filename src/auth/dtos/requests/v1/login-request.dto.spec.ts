import { LoginRequestDtoV1 } from 'src/auth/dtos/requests/v1/login-request.dto';

describe('LoginRequestDtoV1', () => {
  it('should accept an email and a 6-char password', () => {
    expect(
      LoginRequestDtoV1.schema.safeParse({
        email: 'ann@b.co',
        password: 'secret',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['a 5-char password', { email: 'ann@b.co', password: 'abcde' }],
    ['a malformed email', { email: 'ann', password: 'secret' }],
    ['a missing password', { email: 'ann@b.co' }],
  ])('should reject %s', (_label, body) => {
    expect(LoginRequestDtoV1.schema.safeParse(body).success).toBe(false);
  });
});
