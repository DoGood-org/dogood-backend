import { isEnvFlagEnabled } from '@shared/utils/env-flag';

describe('isEnvFlagEnabled', () => {
  it('should be enabled when the variable is not set', () => {
    expect(isEnvFlagEnabled(undefined)).toBe(true);
  });

  it.each(['true', 'TRUE', '1', '', 'yes', 'flase'])(
    'should be enabled for %p',
    (value) => {
      expect(isEnvFlagEnabled(value)).toBe(true);
    },
  );

  it.each(['false', 'FALSE', ' False '])(
    'should be disabled for %p',
    (value) => {
      expect(isEnvFlagEnabled(value)).toBe(false);
    },
  );
});
