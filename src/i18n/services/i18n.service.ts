import { Injectable } from '@nestjs/common';
import {
  DEFAULT_LANGUAGE,
  Language,
  SUPPORTED_LANGUAGES,
} from '../i18n.constants';
import { translations } from '../translations';

export type TranslateArgs = Record<string, string | number>;
export type TranslateFn = (key: string, args?: TranslateArgs) => string;

@Injectable()
export class I18nService {
  translate(key: string, language?: string, args?: TranslateArgs): string {
    const lang = this.resolveLanguage(language);
    const template =
      this.lookup(key, lang) ?? this.lookup(key, DEFAULT_LANGUAGE) ?? key;

    return args ? this.interpolate(template, args) : template;
  }

  getFixedT(language?: string): TranslateFn {
    const lang = this.resolveLanguage(language);
    return (key, args) => this.translate(key, lang, args);
  }

  resolveLanguage(raw?: string | null): Language {
    if (!raw) {
      return DEFAULT_LANGUAGE;
    }

    const candidates = raw
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase().split('-')[0]);

    const match = candidates.find((candidate) =>
      (SUPPORTED_LANGUAGES as readonly string[]).includes(candidate),
    );

    return (match as Language | undefined) ?? DEFAULT_LANGUAGE;
  }

  private lookup(key: string, language: Language): string | undefined {
    let node: unknown = translations[language];

    for (const segment of key.split('.')) {
      if (typeof node !== 'object' || node === null) {
        return undefined;
      }
      node = (node as Record<string, unknown>)[segment];
    }

    return typeof node === 'string' ? node : undefined;
  }

  private interpolate(template: string, args: TranslateArgs): string {
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      name in args ? String(args[name]) : placeholder,
    );
  }
}
