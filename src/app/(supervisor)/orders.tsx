import { Pressable, StyleSheet, Text, View } from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",
  border: "#CAD4D4",
  muted: "#667577",
};

export default function SupervisorOrdersScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>{t("orders.title", "Orders")}</Text>

          <Text style={styles.subtitle}>
            {t(
              "orders.supervisorSubtitle",
              "View and monitor your drivers' orders",
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>O</Text>
          </View>

          <Text style={styles.cardTitle}>
            {t("orders.notAvailableYet", "Orders are not available yet")}
          </Text>

          <Text style={styles.message}>
            {t(
              "orders.supervisorPending",
              "Supervisor order listing will be available once the team orders API is connected.",
            )}
          </Text>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    paddingHorizontal: 16,
    paddingTop: 14,

    backgroundColor: COLORS.light,
  },

  backButton: {
    alignSelf: "flex-start",

    paddingVertical: 5,

    marginBottom: 10,
  },

  backText: {
    fontSize: 13,
    fontWeight: "700",

    color: COLORS.secondary,
  },

  heading: {
    marginBottom: 18,
  },

  title: {
    fontSize: 25,
    fontWeight: "900",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 4,

    fontSize: 13,
    lineHeight: 19,

    color: COLORS.muted,
  },

  card: {
    minHeight: 220,

    paddingHorizontal: 24,
    paddingVertical: 28,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 52,
    height: 52,

    borderRadius: 26,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 14,
  },

  iconText: {
    fontSize: 18,
    fontWeight: "900",

    color: COLORS.primary,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "800",

    color: COLORS.primary,

    textAlign: "center",

    marginBottom: 7,
  },

  message: {
    maxWidth: 300,

    fontSize: 13,
    lineHeight: 20,

    color: COLORS.muted,

    textAlign: "center",
  },
});
