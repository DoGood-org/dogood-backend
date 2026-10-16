import { UpdateUserProfileRequestDtoV1 } from 'src/user/dtos/requests/v1/update-user-profile-request.dto';

describe('UpdateUserProfileRequestDtoV1', () => {
  const parse = (
    body: Record<string, unknown>,
  ): { success: boolean; data?: unknown } =>
    UpdateUserProfileRequestDtoV1.schema.safeParse(body);

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-16T12:00:00Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should accept an empty body', () => {
    expect(parse({}).success).toBe(true);
  });

  it('should accept null for every nullable field', () => {
    expect(
      parse({
        bio: null,
        avatar: null,
        location: null,
        gender: null,
        birthDate: null,
        phoneNumber: null,
        stripeCustomerId: null,
      }).success,
    ).toBe(true);
  });

  it('should accept an empty avatar to clear it', () => {
    expect(parse({ avatar: '' }).success).toBe(true);
  });

  it('should coerce an ISO birth date into a Date', () => {
    const result = parse({ birthDate: '1990-05-01' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ birthDate: new Date('1990-05-01') });
  });

  it.each([
    ['an empty name', { name: '' }],
    ['a 101-char name', { name: 'a'.repeat(101) }],
    ['a 501-char bio', { bio: 'a'.repeat(501) }],
    ['a non-URL avatar', { avatar: 'not a url' }],
    ['an unknown gender', { gender: 'ROBOT' }],
    ['a future birth date', { birthDate: '2027-01-01' }],
    ['an invalid birth date', { birthDate: 'yesterday' }],
    ['a 6-digit phone', { phoneNumber: '123456' }],
    ['a phone with letters', { phoneNumber: '+38067abc4567' }],
    ['a 1-char city', { location: { city: 'K' } }],
  ])('should reject %s', (_label, body) => {
    expect(parse(body).success).toBe(false);
  });

  it.each(['1234567', '+380671234567', '123456789012345'])(
    'should accept phone %p',
    (phoneNumber) => {
      expect(parse({ phoneNumber }).success).toBe(true);
    },
  );

  it('should strip keys outside the legacy schema', () => {
    const result = parse({ name: 'Ann', role: 'ADMIN', email: 'x@y.z' });

    expect(result.data).toEqual({ name: 'Ann' });
  });
});
