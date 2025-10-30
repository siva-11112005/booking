import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

// Import translations
import enTranslations from './locales/en/translation.json';
import taTranslations from './locales/ta/translation.json';
import hiTranslations from './locales/hi/translation.json';

const resources = {
  en: { translation: enTranslations },
  ta: { translation: taTranslations },
  hi: { translation: hiTranslations }
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie']
    },

    interpolation: {
      escapeValue: false
    },

    lng: localStorage.getItem('language') || 'en'
  });

export default i18n;