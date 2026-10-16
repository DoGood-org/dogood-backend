import { AuthEmailRequestDtoV1 } from 'src/auth/dtos/requests/v1/auth-email-request.dto';

describe('AuthEmailRequestDtoV1', () => {
  it('should accept a valid email', () => {
    expect(
      AuthEmailRequestDtoV1.schema.safeParse({ email: 'ann@b.co' }).success,
    ).toBe(true);
  });

  it.each([{ email: 'ann' }, {}])('should reject %p', (body) => {
    expect(AuthEmailRequestDtoV1.schema.safeParse(body).success).toBe(false);
  });
});
