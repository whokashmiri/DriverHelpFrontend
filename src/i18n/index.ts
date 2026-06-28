import "intl-pluralrules";

import * as SecureStore from "expo-secure-store";
import i18n from "i18next";
import { I18nManager } from "react-native";
import { initReactI18next } from "react-i18next";

import { resources } from "./resources";

export type AppLanguage = "ar" | "en";

const LANGUAGE_KEY = "appLanguage";

export async function initI18n() {
  const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);

  const language: AppLanguage =
    savedLanguage === "en" || savedLanguage === "ar" ? savedLanguage : "ar";

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: "ar",
    compatibilityJSON: "v3",
    interpolation: {
      escapeValue: false,
    },
  });

  const shouldBeRTL = language === "ar";

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);

  return i18n;
}

export async function changeLanguage(language: AppLanguage) {
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);

  await i18n.changeLanguage(language);

  const shouldBeRTL = language === "ar";

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
}

export function getCurrentLanguage() {
  return i18n.language as AppLanguage;
}

export function isArabic() {
  return i18n.language === "ar";
}

export default i18n;