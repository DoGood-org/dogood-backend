export const SUPPORTED_LANGUAGES = ['en', 'de', 'uk'] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';
