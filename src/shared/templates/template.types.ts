/**
 * Функція-перекладач, яку шаблони отримують ззовні
 * (структурно сумісна з I18nService.getFixedT з модуля i18n,
 * тому shared не залежить від i18n напряму).
 */
export type TemplateTranslateFn = (
  key: string,
  args?: Record<string, string | number>,
) => string;
