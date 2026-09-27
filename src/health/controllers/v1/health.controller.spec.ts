import { VERSION_NEUTRAL } from '@nestjs/common';
import { VERSION_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { HealthControllerV1 } from 'src/health/controllers/v1/health.controller';

describe('HealthControllerV1', () => {
  it('should be public and version-neutral', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthControllerV1)).toBe(true);
    expect(Reflect.getMetadata(VERSION_METADATA, HealthControllerV1)).toBe(
      VERSION_NEUTRAL,
    );
  });
});
