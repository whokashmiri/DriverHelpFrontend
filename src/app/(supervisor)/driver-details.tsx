import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { MessageCircle, Phone } from "lucide-react-native";

import { router, useLocalSearchParams } from "expo-router";

import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

import { getDriverById, updateDriverStatus } from "../../api/driverApi";

import { getDriverLocation } from "../../api/locationApi";
import { getDriverStats } from "../../api/statsApi";

import { useLanguage } from "../../context/LanguageContext";

import type { Driver } from "../../types/driver";
import type { DriverLocation } from "../../types/location";
import type { DriverStatsResponse } from "../../types/stats";

import { formatDateTime, formatDuration, getErrorMessage } from "../../utils";

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

export default function DriverDetailsScreen() {
  const { t } = useTranslation();

  const { driverId } = useLocalSearchParams<{
    driverId: string;
  }>();

  const { language } = useLanguage();

  const [driver, setDriver] = useState<Driver | null>(null);

  const [stats, setStats] = useState<DriverStatsResponse | null>(null);

  const [location, setLocation] = useState<DriverLocation | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!driverId) {
      return;
    }

    try {
      setError(null);

      const [driverResponse, statsResponse, locationResponse] =
        await Promise.all([
          getDriverById(driverId),
          getDriverStats(driverId, "today"),
          getDriverLocation(driverId),
        ]);

      setDriver(driverResponse.driver);

      setStats(statsResponse);

      setLocation(locationResponse.location);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.detailsLoadFailed", "Unable to load driver"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [driverId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleStatus = async () => {
    if (!driver || !driverId || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);

      const response = await updateDriverStatus(driverId, !driver.isActive);

      setDriver((current) =>
        current
          ? {
              ...current,
              isActive: response.driver.isActive,
            }
          : current,
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.statusFailed", "Unable to update driver status"),
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCall = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForCall(driver.phone);

      await Linking.openURL(`tel:${phone}`);
    } catch {
      setError(t("drivers.callFailed", "Unable to open the phone app"));
    }
  };

  const handleWhatsApp = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForWhatsApp(driver.phone);

      await Linking.openURL(`https://wa.me/${phone}`);
    } catch {
      setError(t("drivers.whatsappFailed", "Unable to open WhatsApp"));
    }
  };

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>← {t("common.back", "Back")}</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error && !driver ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : driver ? (
          <>
            <View style={styles.heading}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {driver.name?.trim().charAt(0).toUpperCase() || "D"}
                </Text>
              </View>

              <View style={styles.headingInfo}>
                <Text style={styles.title} numberOfLines={1}>
                  {driver.name}
                </Text>

                <View
                  style={[
                    styles.statusBadge,

                    driver.isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,

                      driver.isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {driver.isActive
                      ? t("common.active", "Active")
                      : t("common.inactive", "Inactive")}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {t("drivers.information", "Driver Information")}
              </Text>

              <InfoRow
                label={t("profile.iqama", "Iqama ID")}
                value={driver.iqamaId}
              />

              <PhoneRow
                label={t("profile.phone", "Phone")}
                value={driver.phone || "-"}
                hasPhone={!!driver.phone}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
              />
            </View>

            {stats && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {t("stats.today", "Today")}
                </Text>

                <View style={styles.statGrid}>
                  <MiniStat
                    label={t("stats.orders", "Orders")}
                    value={String(stats.orders.total)}
                  />

                  <MiniStat
                    label={t("stats.delivered", "Delivered")}
                    value={String(stats.orders.delivered)}
                  />
                </View>

                <View style={styles.workBox}>
                  <Text style={styles.workLabel}>
                    {t("stats.workingTime", "Working Time")}
                  </Text>

                  <Text style={styles.workValue}>
                    {formatDuration(stats.work.totalSeconds, language)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {t("location.latest", "Latest Location")}
              </Text>

              {location ? (
                <>
                  <Text style={styles.locationText}>
                    {location.latitude}, {location.longitude}
                  </Text>

                  <Text style={styles.locationDate}>
                    {formatDateTime(location.recordedAt, language)}
                  </Text>
                </>
              ) : (
                <Text style={styles.muted}>
                  {t("location.none", "No location available")}
                </Text>
              )}
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.statusButton,

                driver.isActive ? styles.disableButton : styles.enableButton,

                pressed && styles.buttonPressed,

                isUpdatingStatus && styles.buttonDisabled,
              ]}
              disabled={isUpdatingStatus}
              onPress={toggleStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {driver.isActive
                    ? t("drivers.deactivate", "Deactivate Driver")
                    : t("drivers.activate", "Activate Driver")}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PhoneRow({
  label,
  value,
  hasPhone,
  onCall,
  onWhatsApp,
}: {
  label: string;
  value: string;
  hasPhone: boolean;
  onCall: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <View style={styles.phoneRow}>
      <View style={styles.phoneInfo}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue}>{value}</Text>
      </View>

      {hasPhone && (
        <View style={styles.phoneActions}>
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.contactButtonPressed,
            ]}
          >
            <Phone size={18} color={COLORS.primary} />
          </Pressable>

          <Pressable
            onPress={onWhatsApp}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.contactButtonPressed,
            ]}
          >
            <MessageCircle size={19} color={COLORS.secondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>

      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function normalizePhoneForCall(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizePhoneForWhatsApp(phone: string) {
  let value = phone.replace(/\D/g, "");

  // Saudi local mobile:
  // 05XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("05") && value.length === 10) {
    value = `966${value.slice(1)}`;
  }

  // 5XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("5") && value.length === 9) {
    value = `966${value}`;
  }

  // 009665XXXXXXXX -> 9665XXXXXXXX
  if (value.startsWith("00")) {
    value = value.slice(2);
  }

  return value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    marginBottom: 7,
  },

  back: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  loading: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primary,

    marginRight: 9,
  },

  avatarText: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.white,
  },

  headingInfo: {
    flex: 1,
    alignItems: "flex-start",
  },

  title: {
    fontSize: 19,
    fontWeight: "900",
    color: COLORS.primary,
  },

  statusBadge: {
    marginTop: 3,

    paddingHorizontal: 7,
    paddingVertical: 3,

    borderRadius: 999,
  },

  activeBadge: {
    backgroundColor: COLORS.successBackground,
  },

  inactiveBadge: {
    backgroundColor: COLORS.errorBackground,
  },

  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },

  activeText: {
    color: COLORS.success,
  },

  inactiveText: {
    color: COLORS.error,
  },

  card: {
    backgroundColor: COLORS.white,

    borderRadius: 12,

    padding: 11,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,

    marginBottom: 7,
  },

  infoRow: {
    paddingVertical: 7,

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: COLORS.border,
  },

  infoLabel: {
    fontSize: 9,

    fontWeight: "600",

    color: COLORS.muted,
  },

  infoValue: {
    marginTop: 2,

    fontSize: 12,
    fontWeight: "800",

    color: COLORS.black,
  },

  phoneRow: {
    minHeight: 50,

    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 6,
  },

  phoneInfo: {
    flex: 1,
  },

  phoneActions: {
    flexDirection: "row",

    gap: 6,

    marginLeft: 8,
  },

  contactButton: {
    width: 32,
    height: 32,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  contactButtonPressed: {
    opacity: 0.6,
  },

  statGrid: {
    flexDirection: "row",
    gap: 7,
  },

  miniStat: {
    flex: 1,

    minHeight: 56,

    paddingHorizontal: 9,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    justifyContent: "center",
  },

  miniStatValue: {
    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,
  },

  miniStatLabel: {
    marginTop: 2,

    fontSize: 9,

    color: COLORS.muted,
  },

  workBox: {
    marginTop: 7,

    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    borderLeftWidth: 3,
    borderLeftColor: COLORS.secondary,
  },

  workLabel: {
    fontSize: 9,

    color: COLORS.muted,
  },

  workValue: {
    marginTop: 2,

    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,
  },

  locationText: {
    fontSize: 12,

    fontWeight: "800",

    color: COLORS.black,
  },

  locationDate: {
    marginTop: 3,

    fontSize: 9,

    color: COLORS.muted,
  },

  muted: {
    fontSize: 11,

    color: COLORS.muted,
  },

  errorBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 8,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 8,
  },

  errorText: {
    fontSize: 10,
    lineHeight: 14,

    color: COLORS.error,
  },

  statusButton: {
    height: 38,

    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 2,
  },

  disableButton: {
    backgroundColor: COLORS.error,
  },

  enableButton: {
    backgroundColor: COLORS.primary,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonText: {
    color: COLORS.white,

    fontSize: 12,
    fontWeight: "800",
  },
});
