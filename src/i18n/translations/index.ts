import { Language } from 'src/i18n/i18n.constants';
import { en, Translations } from 'src/i18n/translations/en';
import { de } from 'src/i18n/translations/de';
import { uk } from 'src/i18n/translations/uk';

export const translations: Record<Language, Translations> = { en, de, uk };

export type { Translations };
