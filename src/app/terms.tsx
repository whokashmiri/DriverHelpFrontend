import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "../components/AppScreen";
import { useLanguage } from "../context/LanguageContext";

export default function TermsScreen() {
  const { t } = useTranslation();

  const { language } = useLanguage();

  const isArabic = language === "ar";

  const textAlign = isArabic ? "right" : "left";

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{t("common.back", "Back")}</Text>
        </Pressable>

        <Text style={[styles.title, { textAlign }]}>
          {t("terms.title", "Terms & Conditions")}
        </Text>

        <Text style={[styles.updated, { textAlign }]}>
          {t("terms.lastUpdated", "Last updated: September 2026")}
        </Text>

        <TermsSection
          title={t("terms.useTitle", "Use of the Application")}
          body={t(
            "terms.useBody",
            "The TOSH application is provided for authorized drivers and supervisors to manage delivery operations, work shifts, orders, and related operational information.",
          )}
          textAlign={textAlign}
        />

        <TermsSection
          title={t("terms.locationTitle", "Location Information")}
          body={t(
            "terms.locationBody",
            "Driver location information may be collected during active work shifts to support operational monitoring, delivery management, and route history.",
          )}
          textAlign={textAlign}
        />

        <TermsSection
          title={t("terms.accountTitle", "Account Responsibility")}
          body={t(
            "terms.accountBody",
            "Users are responsible for maintaining the confidentiality of their login credentials and for using the application only for authorized business purposes.",
          )}
          textAlign={textAlign}
        />

        <TermsSection
          title={t("terms.photosTitle", "Delivery Photos")}
          body={t(
            "terms.photosBody",
            "Pickup and delivery photos submitted through the application may be retained as part of the operational delivery record.",
          )}
          textAlign={textAlign}
        />

        <TermsSection
          title={t("terms.changesTitle", "Changes")}
          body={t(
            "terms.changesBody",
            "These terms may be updated from time to time. Continued use of the application after an update constitutes acceptance of the revised terms.",
          )}
          textAlign={textAlign}
        />
      </ScrollView>
    </AppScreen>
  );
}

function TermsSection({
  title,
  body,
  textAlign,
}: {
  title: string;
  body: string;
  textAlign: "left" | "right";
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign }]}>{title}</Text>

      <Text style={[styles.body, { textAlign }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0EDEE",
  },

  content: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",

    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },

  backButton: {
    alignSelf: "flex-start",

    paddingVertical: 4,
    paddingHorizontal: 2,

    marginBottom: 10,
  },

  backText: {
    fontSize: 12,
    fontWeight: "700",

    color: "#2C666E",
  },

  title: {
    fontSize: 20,
    fontWeight: "800",

    color: "#07393C",
  },

  updated: {
    marginTop: 3,
    marginBottom: 14,

    fontSize: 10,

    color: "#667577",
  },

  section: {
    paddingHorizontal: 12,
    paddingVertical: 10,

    marginBottom: 8,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: "#CAD4D4",

    backgroundColor: "#FFFFFF",
  },

  sectionTitle: {
    marginBottom: 4,

    fontSize: 12,
    fontWeight: "800",

    color: "#07393C",
  },

  body: {
    fontSize: 11,
    lineHeight: 17,

    color: "#4B5563",
  },
});
