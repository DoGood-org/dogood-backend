import { Test } from '@nestjs/testing';
import { I18nService } from 'src/i18n/services/i18n.service';
import { DEFAULT_LANGUAGE } from 'src/i18n/i18n.constants';
import { translations } from 'src/i18n/translations';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [I18nService],
    }).compile();

    service = moduleRef.get(I18nService);
  });

  describe('translate', () => {
    it('should return the translation for the default language when no language is provided', () => {
      expect(service.translate('email.verification.subject')).toBe(
        translations.en.email.verification.subject,
      );
    });

    it('should return the translation for the requested language', () => {
      expect(service.translate('email.verification.subject', 'uk')).toBe(
        translations.uk.email.verification.subject,
      );
      expect(service.translate('email.verification.subject', 'de')).toBe(
        translations.de.email.verification.subject,
      );
    });

    it('should return the key itself when the translation is missing in every language', () => {
      expect(service.translate('nonexistent.key', 'uk')).toBe(
        'nonexistent.key',
      );
    });

    it('should return the key itself when the key points to an object node instead of a string', () => {
      expect(service.translate('email.verification')).toBe(
        'email.verification',
      );
    });

    it('should return the key itself when the key path goes deeper than a string leaf', () => {
      expect(service.translate('email.verification.subject.extra')).toBe(
        'email.verification.subject.extra',
      );
    });

    it('should interpolate provided args into placeholders', () => {
      const result = service.translate('email.verification.codeExpires', 'en', {
        minutes: 15,
      });

      expect(result).toBe(
        'This verification code will expire in <strong>15 minutes</strong>.',
      );
    });

    it('should keep the placeholder untouched when the arg is not provided', () => {
      const result = service.translate('email.verification.codeExpires', 'en', {
        other: 'value',
      });

      expect(result).toContain('{minutes}');
    });

    it('should skip interpolation when args are not provided', () => {
      expect(service.translate('email.verification.codeExpires', 'en')).toBe(
        translations.en.email.verification.codeExpires,
      );
    });
  });

  describe('resolveLanguage', () => {
    it('should return DEFAULT_LANGUAGE for undefined, null and empty string', () => {
      expect(service.resolveLanguage()).toBe(DEFAULT_LANGUAGE);
      expect(service.resolveLanguage(null)).toBe(DEFAULT_LANGUAGE);
      expect(service.resolveLanguage('')).toBe(DEFAULT_LANGUAGE);
    });

    it('should return a supported language for a plain language code', () => {
      expect(service.resolveLanguage('uk')).toBe('uk');
      expect(service.resolveLanguage('de')).toBe('de');
      expect(service.resolveLanguage('en')).toBe('en');
    });

    it('should be case-insensitive and ignore surrounding whitespace', () => {
      expect(service.resolveLanguage('UK')).toBe('uk');
      expect(service.resolveLanguage('  De ')).toBe('de');
    });

    it('should strip the region suffix', () => {
      expect(service.resolveLanguage('uk-UA')).toBe('uk');
      expect(service.resolveLanguage('de-AT')).toBe('de');
    });

    it('should parse a full Accept-Language header and pick the first supported language', () => {
      expect(service.resolveLanguage('uk-UA,uk;q=0.9,en;q=0.8')).toBe('uk');
      expect(service.resolveLanguage('fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7')).toBe(
        'de',
      );
    });

    it('should return DEFAULT_LANGUAGE when no language from the header is supported', () => {
      expect(service.resolveLanguage('fr-FR,es;q=0.9')).toBe(DEFAULT_LANGUAGE);
      expect(service.resolveLanguage('xx')).toBe(DEFAULT_LANGUAGE);
    });
  });

  describe('getFixedT', () => {
    it('should return a translator fixed to the given language', () => {
      const t = service.getFixedT('uk');

      expect(t('email.verification.subject')).toBe(
        translations.uk.email.verification.subject,
      );
    });

    it('should fall back to DEFAULT_LANGUAGE when no language is provided', () => {
      const t = service.getFixedT();

      expect(t('email.verification.subject')).toBe(
        translations.en.email.verification.subject,
      );
    });

    it('should resolve an Accept-Language header and pass args through to translate', () => {
      const t = service.getFixedT('de-DE,de;q=0.9');

      expect(t('email.verification.codeExpires', { minutes: 5 })).toBe(
        translations.de.email.verification.codeExpires.replace(
          '{minutes}',
          '5',
        ),
      );
    });
  });

  describe('fallback to DEFAULT_LANGUAGE when the key is missing in the requested language', () => {
    it('should use the DEFAULT_LANGUAGE translation', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('src/i18n/translations', () => ({
          translations: {
            en: { greeting: 'Hello', onlyEn: 'English only' },
            de: { greeting: 'Hallo' },
            uk: { greeting: 'Привіт' },
          },
        }));

        const { I18nService: MockedI18nService } =
          await import('src/i18n/services/i18n.service');
        const mockedService = new MockedI18nService();

        expect(mockedService.translate('greeting', 'uk')).toBe('Привіт');
        expect(mockedService.translate('onlyEn', 'uk')).toBe('English only');
      });
    });
  });
});
