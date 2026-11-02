import { SignupRequestDtoV1 } from 'src/auth/dtos/requests/v1/signup-request.dto';

describe('SignupRequestDtoV1', () => {
  const body = { name: 'Ann', email: 'ann@b.co', password: 'secret' };

  it('should accept the legacy minimums (name 3, password 6, no complexity rule)', () => {
    expect(SignupRequestDtoV1.schema.safeParse(body).success).toBe(true);
  });

  it.each([
    ['a 2-char name', { name: 'An' }],
    ['a 31-char name', { name: 'a'.repeat(31) }],
    ['a 5-char password', { password: 'abcde' }],
    ['a malformed email', { email: 'ann@' }],
    ['a missing name', { name: undefined }],
  ])('should reject %s', (_label, override) => {
    expect(
      SignupRequestDtoV1.schema.safeParse({ ...body, ...override }).success,
    ).toBe(false);
  });

  it('should accept a 30-char name', () => {
    expect(
      SignupRequestDtoV1.schema.safeParse({ ...body, name: 'a'.repeat(30) })
        .success,
    ).toBe(true);
  });
});
