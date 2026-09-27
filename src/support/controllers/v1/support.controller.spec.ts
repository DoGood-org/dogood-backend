import { GUARDS_METADATA } from '@nestjs/common/constants';
import { IS_PUBLIC_KEY } from '@shared/decorators/public.decorator';
import { SiteAdminV1Guard } from '@shared/guards/site-admin-v1.guard';
import { SupportControllerV1 } from 'src/support/controllers/v1/support.controller';

describe('SupportControllerV1', () => {
  const metadataOf = (key: string, name: keyof SupportControllerV1): unknown =>
    Reflect.getMetadata(
      key,
      Object.getOwnPropertyDescriptor(SupportControllerV1.prototype, name)
        ?.value,
    );

  it('should keep creating a support message public', () => {
    expect(metadataOf(IS_PUBLIC_KEY, 'createSupportMessage')).toBe(true);
  });

  it.each<keyof SupportControllerV1>([
    'getSupportMessages',
    'getSupportMessageById',
  ])('should keep %s behind auth and SiteAdminV1Guard', (name) => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, SupportControllerV1)).toBe(
      undefined,
    );
    expect(metadataOf(IS_PUBLIC_KEY, name)).toBe(undefined);
    expect(metadataOf(GUARDS_METADATA, name)).toEqual([SiteAdminV1Guard]);
  });
});
