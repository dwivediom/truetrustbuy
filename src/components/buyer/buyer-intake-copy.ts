/** Static UI strings for the buyer intake gate (multilingual headlines). */
export const CHOOSE_LANGUAGE_LINE = {
  en: "Choose your language",
  hi: "अपनी भाषा चुनें",
  zh: "选择您的语言",
  ja: "言語を選択",
  fr: "Choisissez votre langue",
  es: "Elija su idioma",
} as const;

export type PresetLang = keyof typeof CHOOSE_LANGUAGE_LINE;

export const PRESET_LANGS: Array<{ code: PresetLang; label: string }> = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "zh", label: "中文" },
  { code: "ja", label: "日本語" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
];
