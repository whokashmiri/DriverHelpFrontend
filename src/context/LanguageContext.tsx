import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as SecureStore from "expo-secure-store";

import i18n from "../i18n/i18n";

export type AppLanguage = "ar" | "en";

type LanguageContextValue = {
  language: AppLanguage;

  isArabic: boolean;

  isLoadingLanguage: boolean;

  setLanguage: (language: AppLanguage) => Promise<void>;

  toggleLanguage: () => Promise<void>;
};

const LANGUAGE_KEY = "appLanguage";

const DEFAULT_LANGUAGE: AppLanguage = "ar";

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

type LanguageProviderProps = {
  children: React.ReactNode;
};

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<AppLanguage>(DEFAULT_LANGUAGE);

  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);

  useEffect(() => {
    const loadLanguage = async () => {
      console.log("[Language] initialize start");

      try {
        const savedLanguage = await SecureStore.getItemAsync(LANGUAGE_KEY);

        const nextLanguage: AppLanguage = savedLanguage === "en" ? "en" : "ar";

        setLanguageState(nextLanguage);

        await i18n.changeLanguage(nextLanguage);
      } catch (error) {
        console.warn("[Language] initialization failed:", error);

        setLanguageState(DEFAULT_LANGUAGE);

        try {
          await i18n.changeLanguage(DEFAULT_LANGUAGE);
        } catch (i18nError) {
          console.warn("[Language] i18n fallback failed:", i18nError);
        }
      } finally {
        console.log("[Language] initialize complete");

        setIsLoadingLanguage(false);
      }
    };

    void loadLanguage();
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    try {
      await Promise.all([
        i18n.changeLanguage(nextLanguage),

        SecureStore.setItemAsync(LANGUAGE_KEY, nextLanguage),
      ]);

      setLanguageState(nextLanguage);
    } catch (error) {
      console.warn("[Language] change failed:", error);

      throw error;
    }
  }, []);

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === "ar" ? "en" : "ar");
  }, [language, setLanguage]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,

      isArabic: language === "ar",

      isLoadingLanguage,

      setLanguage,

      toggleLanguage,
    }),
    [language, isLoadingLanguage, setLanguage, toggleLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
