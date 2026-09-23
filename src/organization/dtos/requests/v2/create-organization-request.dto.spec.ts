import { CreateOrganizationRequestDtoV2 } from 'src/organization/dtos/requests/v2/create-organization-request.dto';

describe('CreateOrganizationRequestDtoV2', () => {
  it('should accept an https avatar url', () => {
    expect(
      CreateOrganizationRequestDtoV2.schema.safeParse({
        name: 'Helpers',
        avatarUrl: 'https://example.com/a.png',
      }).success,
    ).toBe(true);
  });

  it.each(['javascript:alert(1)', 'data:text/html,<b>x</b>'])(
    'should reject the avatar url %p',
    (avatarUrl) => {
      expect(
        CreateOrganizationRequestDtoV2.schema.safeParse({
          name: 'Helpers',
          avatarUrl,
        }).success,
      ).toBe(false);
    },
  );
});
