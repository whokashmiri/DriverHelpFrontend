import { useCallback, useEffect, useState } from "react";

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

import { getMyDrivers } from "../../api/driverApi";

import { AppScreen } from "../../components/AppScreen";

import { useAuth } from "../../hooks/useAuth";

import type { Driver } from "../../types/driver";

import { getErrorMessage } from "../../utils";

const COLORS = {
  black: "#0A090C",
  light: "#F0EDEE",
  primary: "#07393C",
  secondary: "#2C666E",
  white: "#FFFFFF",

  border: "#D6DEDE",
  muted: "#617174",

  success: "#166534",
  successLight: "#EAF7EE",

  error: "#B91C1C",
  errorLight: "#FDECEC",
};

type DriverStatFilter = "all" | "working" | "notStarted";

export default function SupervisorHomeScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [selectedStat, setSelectedStat] = useState<DriverStatFilter>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyDrivers();

      setDrivers(response.drivers ?? []);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("supervisor.dashboardLoadFailed", "Unable to load dashboard"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /*
   * ALL DRIVERS.
   */
  const totalDrivers = drivers.length;

  /*
   * WORKING:
   *
   * Driver has started at least
   * one shift today.
   */
  const workingDrivers = drivers.filter(
    (driver) => driver.workStatus === "working",
  );

  /*
   * NOT WORKING:
   *
   * Driver has NOT started
   * any shift today.
   */
  const notWorkingDrivers = drivers.filter(
    (driver) => driver.workStatus === "not_started",
  );

  const workingCount = workingDrivers.length;

  const notWorkingCount = notWorkingDrivers.length;

  /*
   * Which drivers should be shown
   * below the stat buttons.
   */
  const visibleDrivers =
    selectedStat === "working"
      ? workingDrivers
      : selectedStat === "notStarted"
        ? notWorkingDrivers
        : drivers;

  const sectionTitle =
    selectedStat === "working"
      ? t("supervisor.workingNow", "Working")
      : selectedStat === "notStarted"
        ? t("supervisor.notWorking", "Not Working")
        : t("supervisor.drivers", "Drivers");

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>
            {t("supervisor.dashboard", "Supervisor Dashboard")}
          </Text>

          {!!user?.name && <Text style={styles.subtitle}>{user.name}</Text>}
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {/*
             * 3 COMPACT STATS
             */}
            <View style={styles.statsRow}>
              <StatCard
                label={t("supervisor.totalDrivers", "Drivers")}
                value={String(totalDrivers)}
                active={selectedStat === "all"}
                onPress={() => setSelectedStat("all")}
              />

              <StatCard
                label={t("supervisor.workingNow", "Working")}
                value={String(workingCount)}
                active={selectedStat === "working"}
                onPress={() => setSelectedStat("working")}
              />

              <StatCard
                label={t("supervisor.notWorking", "Not Working")}
                value={String(notWorkingCount)}
                active={selectedStat === "notStarted"}
                onPress={() => setSelectedStat("notStarted")}
              />
            </View>

            {/*
             * DRIVER LIST
             */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>{sectionTitle}</Text>

                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>
                      {visibleDrivers.length}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => router.push("/(supervisor)/drivers")}
                  style={({ pressed }) => [
                    styles.createDriverButton,

                    pressed && styles.createDriverButtonPressed,
                  ]}
                >
                  <Text style={styles.createDriverButtonText}>
                    + {t("drivers.createDriver", "Create Driver")}
                  </Text>
                </Pressable>
              </View>

              {visibleDrivers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {selectedStat === "working"
                      ? t(
                          "supervisor.noWorkingDrivers",
                          "No drivers have started work yet",
                        )
                      : selectedStat === "notStarted"
                        ? t(
                            "supervisor.allDriversStarted",
                            "All drivers have started work",
                          )
                        : t("supervisor.noDrivers", "No drivers found")}
                  </Text>
                </View>
              ) : (
                visibleDrivers
                  .slice(0, 5)
                  .map((driver) => (
                    <DriverRow key={driver._id ?? driver.id} driver={driver} />
                  ))
              )}

              {visibleDrivers.length > 5 && (
                <Pressable
                  onPress={() => router.push("/(supervisor)/drivers")}
                  style={({ pressed }) => [
                    styles.viewAllButton,

                    pressed && styles.viewAllButtonPressed,
                  ]}
                >
                  <Text style={styles.viewAllText}>
                    {t("common.viewAll", "View All Drivers")}
                  </Text>
                </Pressable>
              )}
            </View>

            {/*
             * QUICK ACTIONS
             */}
            <Text style={styles.actionsTitle}>
              {t("supervisor.quickActions", "Quick Actions")}
            </Text>

            <View style={styles.actions}>
              <DashboardButton
                title={t("supervisor.allDrivers", "Drivers")}
                onPress={() => router.push("/(supervisor)/drivers")}
              />

              <DashboardButton
                title={t("supervisor.liveMap", "Live Map")}
                onPress={() => router.push("/(supervisor)/live-map")}
              />

              <DashboardButton
                title={t("stats.title", "Stats")}
                onPress={() => router.push("/(supervisor)/stats")}
              />

              <DashboardButton
                title={t("orders.title", "Orders")}
                onPress={() => router.push("/(supervisor)/orders")}
              />
            </View>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function DriverRow({ driver }: { driver: Driver }) {
  const { t } = useTranslation();

  const driverId = driver._id ?? driver.id;

  const hasStarted = driver.workStatus === "working";

  return (
    <Pressable
      disabled={!driverId}
      onPress={() => {
        if (!driverId) {
          return;
        }

        router.push({
          pathname: "/(supervisor)/driver-details",

          params: {
            driverId,
          },
        });
      }}
      style={({ pressed }) => [
        styles.driverRow,

        pressed && styles.driverRowPressed,
      ]}
    >
      <View style={styles.driverAvatar}>
        <Text style={styles.driverAvatarText}>
          {driver.name?.trim().charAt(0).toUpperCase() || "D"}
        </Text>
      </View>

      <View style={styles.driverInfo}>
        <Text style={styles.driverName} numberOfLines={1}>
          {driver.name}
        </Text>

        <Text style={styles.driverIqama} numberOfLines={1}>
          {driver.iqamaId}
        </Text>
      </View>

      <View
        style={[
          styles.workBadge,

          hasStarted ? styles.workingBadge : styles.notStartedBadge,
        ]}
      >
        <Text
          style={[
            styles.workBadgeText,

            hasStarted ? styles.workingText : styles.notStartedText,
          ]}
        >
          {hasStarted
            ? t("supervisor.workingNow", "Working")
            : t("supervisor.notWorking", "Not Working")}
        </Text>
      </View>

      {!driver.isActive && (
        <View style={styles.inactiveAccountBadge}>
          <Text style={styles.inactiveAccountText}>
            {t("common.inactive", "Inactive")}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  active,
  onPress,
}: {
  label: string;

  value: string;

  active: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,

        active && styles.statCardActive,

        pressed && styles.statCardPressed,
      ]}
    >
      <Text style={[styles.statValue, active && styles.statValueActive]}>
        {value}
      </Text>

      <Text
        numberOfLines={1}
        style={[styles.statLabel, active && styles.statLabelActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DashboardButton({
  title,
  onPress,
}: {
  title: string;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,

        pressed && styles.actionButtonPressed,
      ]}
    >
      <Text numberOfLines={1} style={styles.actionText}>
        {title}
      </Text>
    </Pressable>
  );
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
    paddingTop: 10,
    paddingBottom: 30,
  },

  heading: {
    marginBottom: 10,
  },

  title: {
    fontSize: 17,
    fontWeight: "800",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 2,

    fontSize: 10,

    color: COLORS.secondary,
  },

  center: {
    minHeight: 180,

    alignItems: "center",
    justifyContent: "center",
  },

  errorBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,

    borderRadius: 10,

    backgroundColor: COLORS.errorLight,
  },

  errorText: {
    fontSize: 10,

    color: COLORS.error,
  },

  /*
   * THREE STAT CARDS
   */
  statsRow: {
    flexDirection: "row",

    gap: 7,

    marginBottom: 12,
  },

  statCard: {
    flex: 1,

    minWidth: 0,

    height: 64,

    paddingHorizontal: 5,
    paddingVertical: 7,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,
  },

  statCardActive: {
    backgroundColor: COLORS.primary,

    borderColor: COLORS.primary,
  },

  statCardPressed: {
    opacity: 0.75,
  },

  statValue: {
    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,
  },

  statValueActive: {
    color: COLORS.white,
  },

  statLabel: {
    marginTop: 2,

    fontSize: 8,
    fontWeight: "700",

    color: COLORS.muted,

    textAlign: "center",
  },

  statLabelActive: {
    color: "#D9E6E7",
  },

  /*
   * DRIVER SECTION
   */
  section: {
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 7,

    marginBottom: 12,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,
  },

  sectionHeader: {
    flexDirection: "row",

    alignItems: "center",
    justifyContent: "space-between",

    marginBottom: 5,
  },

  sectionTitleRow: {
    flexDirection: "row",

    alignItems: "center",

    flexShrink: 1,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",

    color: COLORS.primary,
  },

  countBadge: {
    minWidth: 20,
    height: 20,

    marginLeft: 6,

    paddingHorizontal: 5,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.light,
  },

  countText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.secondary,
  },

  createDriverButton: {
    minHeight: 29,

    marginLeft: 8,

    paddingHorizontal: 8,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.primary,
  },

  createDriverButtonPressed: {
    backgroundColor: COLORS.secondary,
  },

  createDriverButtonText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.white,
  },

  driverRow: {
    minHeight: 48,

    flexDirection: "row",

    alignItems: "center",

    paddingVertical: 6,

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: COLORS.border,
  },

  driverRowPressed: {
    opacity: 0.65,
  },

  driverAvatar: {
    width: 32,
    height: 32,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 16,

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginRight: 8,
  },

  driverAvatarText: {
    fontSize: 11,
    fontWeight: "900",

    color: COLORS.primary,
  },

  driverInfo: {
    flex: 1,

    minWidth: 0,

    paddingRight: 6,
  },

  driverName: {
    fontSize: 10,
    fontWeight: "700",

    color: COLORS.black,
  },

  driverIqama: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  workBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,

    borderRadius: 999,
  },

  workingBadge: {
    backgroundColor: COLORS.successLight,
  },

  notStartedBadge: {
    backgroundColor: COLORS.light,
  },

  workBadgeText: {
    fontSize: 7,
    fontWeight: "800",
  },

  workingText: {
    color: COLORS.success,
  },

  notStartedText: {
    color: COLORS.muted,
  },

  inactiveAccountBadge: {
    marginLeft: 4,

    paddingHorizontal: 5,
    paddingVertical: 3,

    borderRadius: 999,

    backgroundColor: COLORS.errorLight,
  },

  inactiveAccountText: {
    fontSize: 7,
    fontWeight: "800",

    color: COLORS.error,
  },

  emptyState: {
    paddingVertical: 14,

    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 9,

    color: COLORS.muted,

    textAlign: "center",
  },

  viewAllButton: {
    height: 29,

    marginTop: 5,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  viewAllButtonPressed: {
    opacity: 0.7,
  },

  viewAllText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.secondary,
  },

  /*
   * QUICK ACTIONS
   */
  actionsTitle: {
    marginBottom: 6,

    fontSize: 11,
    fontWeight: "800",

    color: COLORS.primary,
  },

  actions: {
    flexDirection: "row",

    gap: 6,
  },

  actionButton: {
    flex: 1,

    height: 34,

    minWidth: 0,

    paddingHorizontal: 3,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.primary,
  },

  actionButtonPressed: {
    backgroundColor: COLORS.secondary,
  },

  actionText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.white,

    textAlign: "center",
  },
});
