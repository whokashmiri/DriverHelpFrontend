
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

  // Only an explicit car assignment gets the car target.
  // Missing or unknown vehicle types default to bike.
  const vehicleType =
    user?.vehicleType === "car" ? "car" : "bike";

  const vehicleTypeLabel =
    vehicleType === "car"
      ? t("profile.car", "Car")
      : t("profile.bike", "Bike");

  const dailyDeliveryTarget =
    vehicleType === "car" ? 17 : 14;

  const statusLabel = user?.isActive
    ? t("profile.active", "Active")
    : t("profile.inactive", "Inactive");

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      setError(null);

      await logout();

      router.replace("/(auth)/login");
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("auth.logoutFailed", "Unable to logout"),
        ),
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
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <Text style={styles.backText}>
            {"← "}
            {t("common.back", "Back")}
          </Text>
        </Pressable>

        {/* Compact profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user?.name)}
            </Text>
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
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Account information */}
        <Text
          style={[
            styles.sectionTitle,
            {
              textAlign: isArabic ? "right" : "left",
            },
          ]}
        >
          {t(
            "profile.accountInformation",
            "Account Information",
          )}
        </Text>

        <View style={styles.card}>
          {/* Name */}
          <ProfileField
            label={t("profile.name", "Name")}
            value={user?.name || "-"}
            isArabic={isArabic}
          />

          {/* Iqama and phone */}
          <View style={styles.fieldRow}>
            <ProfileField
              label={t("profile.iqama", "Iqama ID")}
              value={user?.iqamaId || "-"}
              isArabic={isArabic}
              flex
            />

            <ProfileField
              label={t("profile.phone", "Phone Number")}
              value={user?.phone || "-"}
              isArabic={isArabic}
              flex
            />
          </View>

          {/* Role and vehicle */}
          <View style={styles.fieldRow}>
            <ProfileField
              label={t("profile.role", "Role")}
              value={t("profile.driver", "Driver")}
              isArabic={isArabic}
              flex
            />

            <ProfileField
              label={t("profile.vehicleType", "Vehicle Type")}
              value={vehicleTypeLabel}
              isArabic={isArabic}
              flex
            />
          </View>

          {/* Target and status */}
          <View style={styles.fieldRow}>
            <ProfileField
              label={t("profile.dailyTarget", "Daily Target")}
              value={`${dailyDeliveryTarget} ${t(
                "profile.deliveries",
                "Deliveries",
              )}`}
              isArabic={isArabic}
              flex
            />

            <ProfileField
              label={t("profile.status", "Status")}
              value={statusLabel}
              isArabic={isArabic}
              flex
              valueColor={
                user?.isActive ? COLORS.success : COLORS.error
              }
            />
          </View>

          {/* Vehicle plate */}
          <ProfileField
            label={t(
              "profile.vehiclePlate",
              "Vehicle Plate Number",
            )}
            value={user?.vehiclePlateNumber || "-"}
            isArabic={isArabic}
          />
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Logout */}
        <Pressable
          disabled={isLoggingOut}
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              !isLoggingOut &&
              styles.logoutButtonPressed,
            isLoggingOut && styles.disabledButton,
          ]}
        >
          {isLoggingOut ? (
            <ActivityIndicator
              size="small"
              color={COLORS.white}
            />
          ) : (
            <Text style={styles.logoutText}>
              {t("auth.logout", "Logout")}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </AppScreen>
  );
}

/*
 * Compact reusable information field.
 * Safe for empty or missing values.
 */
function ProfileField({
  label,
  value,
  flex = false,
  isArabic = false,
  valueColor,
}: {
  label: string;
  value: string;
  flex?: boolean;
  isArabic?: boolean;
  valueColor?: string;
}) {
  return (
    <View
      style={[
        styles.field,
        flex && styles.fieldFlex,
      ]}
    >
      <Text
        style={[
          styles.fieldLabel,
          {
            textAlign: isArabic ? "right" : "left",
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.fieldValue,
          valueColor ? { color: valueColor } : null,
          {
            textAlign: isArabic ? "right" : "left",
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value || "-"}
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
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingRight: 8,
    marginBottom: 7,
  },

  backButtonPressed: {
    opacity: 0.6,
  },

  backText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 12,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.white,
  },

  headerInfo: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 9,
  },

  name: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },

  role: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.muted,
  },

  statusBadge: {
    paddingHorizontal: 7,
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
    marginBottom: 6,
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },

  card: {
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    gap: 6,
  },

  fieldRow: {
    flexDirection: "row",
    gap: 6,
  },

  field: {
    minWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },

  fieldFlex: {
    flex: 1,
  },

  fieldLabel: {
    marginBottom: 3,
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.muted,
  },

  fieldValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.black,
  },

  errorBox: {
    marginTop: 10,
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
    height: 40,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: COLORS.error,
  },

  logoutButtonPressed: {
    opacity: 0.82,
  },

  logoutText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.white,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
