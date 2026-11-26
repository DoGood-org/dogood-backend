// NOTE: a check flag is on unless explicitly set to `false`, so an unset or mistyped variable never disables a check.
export const isEnvFlagEnabled = (value: string | undefined): boolean =>
  value?.trim().toLowerCase() !== 'false';
