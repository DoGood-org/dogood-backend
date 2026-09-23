import { CreateContactRequestDtoV1 } from 'src/support/dtos/requests/v1/create-contact-request.dto';

describe('CreateContactRequestDtoV1', () => {
  const body = { name: 'Ann', email: 'ann@b.co', message: 'Hi' };

  it.each(['1234567', '+38 (067) 12-34', '123456789012345'])(
    'should accept phone %p',
    (phone: string) => {
      expect(
        CreateContactRequestDtoV1.schema.safeParse({ ...body, phone }).success,
      ).toBe(true);
    },
  );

  it.each(['123456', '1234567890123456', '12345ab', '12+34567'])(
    'should reject phone %p',
    (phone: string) => {
      expect(
        CreateContactRequestDtoV1.schema.safeParse({ ...body, phone }).success,
      ).toBe(false);
    },
  );
});
