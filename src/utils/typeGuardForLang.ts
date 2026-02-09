const SUPPORTED_LANGS = ['en', 'de', 'uk'] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const isLang = (value: any): value is Lang =>
  SUPPORTED_LANGS.includes(value);