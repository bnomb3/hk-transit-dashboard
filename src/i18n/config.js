import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Settings } from "luxon";

import translationEN from "./locales/en.json";
import translationTC from "./locales/zh-HK.json";
import translationSC from "./locales/zh-CN.json";

// Luxon locale mapping
const luxonLocaleMap = {
  en: "en",
  "zh-HK": "zh-Hant",
  "zh-CN": "zh-Hans",
};

// Function to update Luxon locale
export const updateLuxonLocale = (language) => {
  Settings.defaultLocale = luxonLocaleMap[language] || "en";
};

const resources = {
  en: {
    translation: translationEN,
  },
  "zh-HK": {
    translation: translationTC,
  },
  "zh-CN": {
    translation: translationSC,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Set initial Luxon locale
updateLuxonLocale(i18n.language);

// Update Luxon locale when i18n language changes
i18n.on("languageChanged", (lng) => {
  updateLuxonLocale(lng);
});

export default i18n;
