import { DefaultTheme, ThemeProvider } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { changeLanguage, getCurrentLanguage, initI18n } from "@/i18n";

export default function TabLayout() {
  const [ready, setReady] = useState(false);
  const [language, setLanguage] = useState<"ar" | "en">("ar");

  useEffect(() => {
    initI18n().finally(() => {
      const currentLanguage = getCurrentLanguage();

      if (currentLanguage === "en" || currentLanguage === "ar") {
        setLanguage(currentLanguage);
      }

      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />

      <LanguageToggle language={language} setLanguage={setLanguage} />
    </ThemeProvider>
  );
}

function LanguageToggle({
  language,
  setLanguage,
}: {
  language: "ar" | "en";
  setLanguage: (language: "ar" | "en") => void;
}) {
  const { t } = useTranslation();

  async function handleToggleLanguage() {
    const nextLanguage = language === "ar" ? "en" : "ar";

    await changeLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  return (
    <View
      style={[
        styles.languageToggleWrapper,
        I18nManager.isRTL ? styles.languageToggleLeft : styles.languageToggleRight,
      ]}
    >
      <Text style={styles.languageLabel}>{t("common.language")}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handleToggleLanguage}
        style={styles.languageButton}
      >
        <Text style={styles.languageButtonText}>
          {language === "ar" ? t("common.english") : t("common.arabic")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },

  languageToggleWrapper: {
    position: "absolute",
    top: 52,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 8,
  },

  languageToggleRight: {
    right: 10,
  },

  languageToggleLeft: {
    left: 16,
  },

  languageLabel: {
    fontSize: 7,
    fontWeight: "500",
    color: "#64748b",
  },

  languageButton: {
    minWidth: 74,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  languageButtonText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#ffffff",
  },
});