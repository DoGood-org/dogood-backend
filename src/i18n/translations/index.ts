import { Language } from '../i18n.constants';
import { en, Translations } from './en';
import { de } from './de';
import { uk } from './uk';

export const translations: Record<Language, Translations> = { en, de, uk };

export type { Translations };
