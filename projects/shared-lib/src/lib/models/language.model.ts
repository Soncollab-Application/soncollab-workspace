export interface Language {
  code: string;
  name: string;
  flagPath: string;
}

export const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', flagPath: 'shared-lib/assets/flags/fr.svg' },
  { code: 'en', name: 'English', flagPath: 'shared-lib/assets/flags/gb.svg' }
];
