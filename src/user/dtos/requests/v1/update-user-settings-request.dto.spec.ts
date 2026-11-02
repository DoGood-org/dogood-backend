import { UpdateUserSettingsRequestDtoV1 } from 'src/user/dtos/requests/v1/update-user-settings-request.dto';

describe('UpdateUserSettingsRequestDtoV1', () => {
  it.each([{}, { theme: 'light' }, { theme: 'dark', language: 'de' }])(
    'should accept %p',
    (body) => {
      expect(
        UpdateUserSettingsRequestDtoV1.schema.safeParse(body).success,
      ).toBe(true);
    },
  );

  it.each([{ theme: 'blue' }, { language: 'e' }, { language: 'en-GB-x' }])(
    'should reject %p',
    (body) => {
      expect(
        UpdateUserSettingsRequestDtoV1.schema.safeParse(body).success,
      ).toBe(false);
    },
  );

  it('should strip userId and other columns so a caller cannot touch another row', () => {
    const result = UpdateUserSettingsRequestDtoV1.schema.safeParse({
      theme: 'dark',
      userId: 'user-2',
      id: 'settings-2',
    });

    expect(result.data).toEqual({ theme: 'dark' });
  });
});
