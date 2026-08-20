export interface UserSettingsV2 {
  id: string;
  theme: string;
  language: string;
}

export interface UpdateUserSettingsV2 {
  theme?: string;
  language?: string;
}
