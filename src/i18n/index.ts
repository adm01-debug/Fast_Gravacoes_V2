import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';

// Resources estruturados corretamente com namespaces
export const resources = {
  'pt': {
    translation: ptBR,
  },
  'pt-BR': {
    translation: ptBR,
  },
  'en': {
    translation: enUS,
  },
  'en-US': {
    translation: enUS,
  },
  'es': {
    translation: esES,
  },
  'es-ES': {
    translation: esES,
  },
} as const;

export const supportedLanguages = [
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR', // Idioma padrão
    fallbackLng: {
      'pt': ['pt-BR'],
      'default': ['pt-BR']
    },
    supportedLngs: ['pt-BR', 'pt', 'en-US', 'en', 'es-ES', 'es'],
    nonExplicitSupportedLngs: true,
    load: 'currentOnly',
    ns: ['translation'],
    defaultNS: 'translation',

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'fastgrava-language',
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

    // Debug em dev — silenciado para não poluir o console
    debug: false,
  });

export default i18n;

// Type-safe translation keys
export type TranslationKey = keyof typeof ptBR.common | keyof typeof ptBR.dashboard | keyof typeof ptBR.jobs;
