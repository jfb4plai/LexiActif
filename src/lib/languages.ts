// src/lib/languages.ts

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français', speechLang: 'fr-FR' },
  { code: 'nl', label: 'Néerlandais / Flamand', speechLang: 'nl-BE' },
  { code: 'en', label: 'Anglais', speechLang: 'en-GB' },
  { code: 'de', label: 'Allemand', speechLang: 'de-DE' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export function speechLangFor(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.speechLang ?? 'fr-FR';
}

export function languageLabelFor(code: string): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}
