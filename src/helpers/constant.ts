export const SUPPORTED_LANG_VALUES = ['default', 'en', 'de'] as const;
export type SupportedLang = typeof SUPPORTED_LANG_VALUES[number];
