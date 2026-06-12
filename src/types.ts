export interface User {
  email: string;
  name: string;
}

export interface TranslationRecord {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

export type LanguageCode = "en" | "es" | "bn" | "fr" | "ar";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}
