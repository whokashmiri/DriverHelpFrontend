import { useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

import { useAuth } from "../../hooks/useAuth";

import { useLanguage } from "../../context/LanguageContext";

import { getErrorMessage } from "../../utils";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",
  border: "#CAD4D4",
  muted: "#667577",
  error: "#B91C1C",
  errorLight: "#FDECEC",
  success: "#166534",
  successLight: "#EAF7EE",
};

export default function DriverProfileScreen() {
  const { t } = useTranslation();

  const { user, logout } = useAuth();

  const { language } = useLanguage();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const isArabic = language === "ar";

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      setError(null);

      await logout();

      router.replace("/(auth)/login");
    } catch (err) {
      setError(
        getErrorMessage(err, t("auth.logoutFailed", "Unable to logout")),
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text
              style={[
                styles.name,
                {
                  textAlign: isArabic ? "right" : "left",
                },
              ]}
              numberOfLines={1}
            >
              {user?.name || t("profile.driver", "Driver")}
            </Text>

            <Text
              style={[
                styles.role,
                {
                  textAlign: isArabic ? "right" : "left",
                },
              ]}
            >
              {t("profile.driver", "Driver")}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              user?.isActive
                ? styles.statusBadgeActive
                : styles.statusBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                user?.isActive
                  ? styles.statusTextActive
                  : styles.statusTextInactive,
              ]}
            >
              {user?.isActive
                ? t("profile.active", "Active")
                : t("profile.inactive", "Inactive")}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            {
              textAlign: isArabic ? "right" : "left",
            },
          ]}
        >
          {t("profile.accountInformation", "Account Information")}
        </Text>

        <View style={styles.card}>
          <ProfileRow
            label={t("profile.name", "Name")}
            value={user?.name || "-"}
          />

          <ProfileRow
            label={t("profile.iqama", "Iqama ID")}
            value={user?.iqamaId || "-"}
          />

          <ProfileRow
            label={t("profile.role", "Role")}
            value={t("profile.driver", "Driver")}
          />

          <ProfileRow
            label={t("profile.status", "Status")}
            value={
              user?.isActive
                ? t("profile.active", "Active")
                : t("profile.inactive", "Inactive")
            }
            isLast
          />
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && !isLoggingOut && styles.logoutButtonPressed,
            isLoggingOut && styles.disabledButton,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.logoutText}>{t("auth.logout", "Logout")}</Text>
          )}
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

function ProfileRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.label}>{label}</Text>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function getInitials(name?: string) {
  if (!name?.trim()) {
    return "D";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    width: "100%",
    maxWidth: 720,

    alignSelf: "center",

    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },

  backButton: {
    alignSelf: "flex-start",

    paddingVertical: 5,
    paddingRight: 8,

    marginBottom: 12,
  },

  backButtonPressed: {
    opacity: 0.6,
  },

  backText: {
    fontSize: 12,
    fontWeight: "700",

    color: COLORS.secondary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",

    padding: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: COLORS.white,

    marginBottom: 18,
  },

  avatar: {
    width: 44,
    height: 44,

    borderRadius: 22,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primary,
  },

  avatarText: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.white,
  },

  headerInfo: {
    flex: 1,

    marginHorizontal: 10,
  },

  name: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.primary,
  },

  role: {
    marginTop: 2,

    fontSize: 10,

    color: COLORS.muted,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 999,
  },

  statusBadgeActive: {
    backgroundColor: COLORS.successLight,
  },

  statusBadgeInactive: {
    backgroundColor: COLORS.errorLight,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  statusTextActive: {
    color: COLORS.success,
  },

  statusTextInactive: {
    color: COLORS.error,
  },

  sectionTitle: {
    marginBottom: 7,

    fontSize: 12,
    fontWeight: "800",

    color: COLORS.primary,
  },

  card: {
    overflow: "hidden",

    paddingHorizontal: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: COLORS.white,
  },

  row: {
    paddingVertical: 11,

    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  label: {
    marginBottom: 2,

    fontSize: 9,
    fontWeight: "600",

    color: COLORS.muted,
  },

  value: {
    fontSize: 12,
    fontWeight: "700",

    color: COLORS.black,
  },

  errorBox: {
    marginTop: 12,

    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.errorLight,
  },

  errorText: {
    fontSize: 10,

    color: COLORS.error,
  },

  logoutButton: {
    height: 44,

    marginTop: 16,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: COLORS.error,
  },

  logoutButtonPressed: {
    opacity: 0.82,
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "800",

    color: COLORS.white,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
