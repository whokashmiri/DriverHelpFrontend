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
  errorBackground: "#FDECEC",

  success: "#166534",
  successBackground: "#EAF7EE",
};

export default function SupervisorProfileScreen() {
  const { t } = useTranslation();

  const { user, logout } = useAuth();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [error, setError] = useState<string | null>(null);

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

  const initial = user?.name?.trim().charAt(0).toUpperCase() || "S";

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("profile.title", "Profile")}</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.identityInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.name || "-"}
            </Text>

            <Text style={styles.iqama} numberOfLines={1}>
              {user?.iqamaId || "-"}
            </Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {t("profile.supervisor", "Supervisor")}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("profile.accountInformation", "Account Information")}
          </Text>

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
            value={t("profile.supervisor", "Supervisor")}
          />

          <View style={styles.statusRow}>
            <Text style={styles.label}>{t("profile.status", "Status")}</Text>

            <View
              style={[
                styles.statusBadge,

                user?.isActive ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,

                  user?.isActive ? styles.activeText : styles.inactiveText,
                ]}
              >
                {user?.isActive
                  ? t("common.active", "Active")
                  : t("common.inactive", "Inactive")}
              </Text>
            </View>
          </View>
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

            isLoggingOut && styles.logoutButtonDisabled,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.logoutText}>{t("auth.logout", "Logout")}</Text>
          )}
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
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

  title: {
    fontSize: 25,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 16,
  },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",

    padding: 16,

    borderRadius: 16,

    backgroundColor: COLORS.primary,

    marginBottom: 14,
  },

  avatar: {
    width: 54,
    height: 54,

    borderRadius: 27,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.white,

    marginRight: 13,
  },

  avatarText: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.primary,
  },

  identityInfo: {
    flex: 1,
    alignItems: "flex-start",
  },

  name: {
    fontSize: 17,
    fontWeight: "900",
    color: COLORS.white,
  },

  iqama: {
    marginTop: 3,

    fontSize: 12,

    color: "#D9E6E7",
  },

  roleBadge: {
    marginTop: 7,

    paddingHorizontal: 9,
    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: COLORS.secondary,
  },

  roleText: {
    fontSize: 10,
    fontWeight: "800",

    color: COLORS.white,
  },

  card: {
    paddingHorizontal: 15,
    paddingTop: 15,

    borderRadius: 16,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",

    color: COLORS.primary,

    marginBottom: 5,
  },

  row: {
    paddingVertical: 12,

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: COLORS.border,
  },

  label: {
    fontSize: 11,
    fontWeight: "600",

    color: COLORS.muted,
  },

  value: {
    marginTop: 4,

    fontSize: 14,
    fontWeight: "800",

    color: COLORS.black,
  },

  statusRow: {
    minHeight: 58,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingVertical: 11,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: COLORS.successBackground,
  },

  inactiveBadge: {
    backgroundColor: COLORS.errorBackground,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },

  activeText: {
    color: COLORS.success,
  },

  inactiveText: {
    color: COLORS.error,
  },

  errorBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,

    borderRadius: 10,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 12,
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,

    color: COLORS.error,
  },

  logoutButton: {
    height: 47,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: COLORS.error,

    marginTop: 4,
  },

  logoutButtonPressed: {
    opacity: 0.82,
  },

  logoutButtonDisabled: {
    opacity: 0.55,
  },

  logoutText: {
    color: COLORS.white,

    fontSize: 14,
    fontWeight: "800",
  },
});
