import { updateMyProfileRequestSchemaV2 } from 'src/user/dtos/v2/requests/update-my-profile-request.dto';

const parseAvatar = (avatar: unknown): boolean =>
  updateMyProfileRequestSchemaV2.safeParse({ avatar }).success;

describe('updateMyProfileRequestSchemaV2 avatar', () => {
  it('should accept an https URL', () => {
    expect(parseAvatar('https://cdn.example.com/avatar.png')).toBe(true);
  });

  it('should accept an empty string as the "clear the avatar" value', () => {
    expect(parseAvatar('')).toBe(true);
  });

  it('should accept null and undefined', () => {
    expect(parseAvatar(null)).toBe(true);
    expect(parseAvatar(undefined)).toBe(true);
  });

  it('should reject a javascript: URL', () => {
    expect(parseAvatar('javascript:alert(1)')).toBe(false);
  });

  it('should reject a data: URL', () => {
    expect(
      parseAvatar('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='),
    ).toBe(false);
  });

  it('should reject a file: URL', () => {
    expect(parseAvatar('file:///etc/passwd')).toBe(false);
  });

  it('should accept a plain http URL', () => {
    expect(parseAvatar('http://cdn.example.com/avatar.png')).toBe(true);
  });

  it('should reject a string that is not a URL at all', () => {
    expect(parseAvatar('not a url')).toBe(false);
  });

  it('should report the protocol error message', () => {
    const result = updateMyProfileRequestSchemaV2.safeParse({
      avatar: 'javascript:alert(1)',
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      'Avatar must be an http or https URL',
    );
  });
});

describe('updateMyProfileRequestSchemaV2 location', () => {
  it('should reject a city made of spaces only', () => {
    expect(
      updateMyProfileRequestSchemaV2.safeParse({ location: { city: '  ' } })
        .success,
    ).toBe(false);
  });

  it('should reject a city made of tabs only', () => {
    expect(
      updateMyProfileRequestSchemaV2.safeParse({ location: { city: '\t\t' } })
        .success,
    ).toBe(false);
  });

  it('should reject a location whose three fields are all blank', () => {
    expect(
      updateMyProfileRequestSchemaV2.safeParse({
        location: { country: '  ', region: '\n\n', city: '   ' },
      }).success,
    ).toBe(false);
  });

  it('should store a padded value trimmed so one city keeps one dictionary row', () => {
    expect(
      updateMyProfileRequestSchemaV2.parse({ location: { city: ' Kyiv ' } }),
    ).toEqual({ location: { city: 'Kyiv' } });
  });

  it('should keep accepting plain values', () => {
    expect(
      updateMyProfileRequestSchemaV2.parse({
        location: { country: 'Ukraine', region: 'Kyiv Oblast', city: 'Kyiv' },
      }),
    ).toEqual({
      location: { country: 'Ukraine', region: 'Kyiv Oblast', city: 'Kyiv' },
    });
  });

  it('should keep the four branches the location fix relies on', () => {
    expect(updateMyProfileRequestSchemaV2.parse({})).toEqual({});
    expect(updateMyProfileRequestSchemaV2.parse({ location: null })).toEqual({
      location: null,
    });
    expect(updateMyProfileRequestSchemaV2.parse({ location: {} })).toEqual({
      location: {},
    });
    expect(
      updateMyProfileRequestSchemaV2.parse({ location: { city: null } }),
    ).toEqual({ location: { city: null } });
  });
});
