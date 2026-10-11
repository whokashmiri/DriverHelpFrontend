import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import { useTranslation } from "react-i18next";

import { getActiveShift } from "../../api/shiftApi";

import { getSupervisorDriversDashboard } from "../../api/statsApi";

import { AppScreen } from "../../components/AppScreen";

import { useAuth } from "../../hooks/useAuth";

import type { SupervisorDashboardDriverItem } from "../../types/stats";

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

type DashboardDriverRow = {
  _id: string;

  name: string;

  profilePictureUrl?: string | null;

  shortName?: string | null;

  iqamaId: string;

  phone?: string | null;

  isActive: boolean;

  role: "driver" | "supervisor";

  isSupervisorSelf?: boolean;

  workingNow: boolean;

  orders: {
    deliveredToday: number;

    deliveredThisMonth: number;
  };

  todayWork: {
    firstShiftStartedAt: string | null;

    lastShiftEndedAt: string | null;

    totalSeconds: number;

    totalHours: number;

    workingNow: boolean;
  };
};

/**
 * Format shift time in Riyadh time.
 */
function formatTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",

    timeZone: "Asia/Riyadh",
  }).format(date);
}

/**
 * Format seconds as:
 *
 * 7h 30m
 *
 * instead of 7.50 or 7.30.
 */
function formatDuration(seconds: number | null | undefined) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);

  const totalMinutes = Math.floor(safeSeconds / 60);

  const hours = Math.floor(totalMinutes / 60);

  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) {
    return "0m";
  }

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default function SupervisorHomeScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const [dashboardDrivers, setDashboardDrivers] = useState<
    SupervisorDashboardDriverItem[]
  >([]);

  const [supervisorIsWorking, setSupervisorIsWorking] = useState(false);

  const [selectedStat, setSelectedStat] = useState<DriverStatFilter>("all");

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      const [dashboardResponse, activeShiftResponse] = await Promise.all([
        getSupervisorDriversDashboard(),

        getActiveShift(),
      ]);

      setDashboardDrivers(dashboardResponse.drivers ?? []);

      setSupervisorIsWorking(Boolean(activeShiftResponse?.shift));
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

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  /*
   * Convert backend dashboard
   * response into UI rows.
   */
  const driverRows: DashboardDriverRow[] = dashboardDrivers.map((item) => ({
    _id: item.driver._id,

    name: item.driver.name,
    profilePictureUrl: item.driver?.profilePicture?.url ?? null,

    shortName: item.driver.shortName,

    iqamaId: item.driver.iqamaId,

    phone: item.driver.phone ?? null,

    isActive: item.driver.isActive,

    role: "driver",

    workingNow: item.todayWork.workingNow,

    orders: item.orders,

    todayWork: item.todayWork,
  }));

  /*
   * Supervisor can also work as
   * a delivery user.
   *
   * Keep existing behavior:
   * show supervisor only when
   * supervisor currently has
   * an active shift.
   *
   * Driver statistics are not
   * rendered for this special row.
   */
  const supervisorWorkingRow: DashboardDriverRow | null =
    supervisorIsWorking && user
      ? {
          _id: user.id,

          name: user.name,

          shortName: user.name,

          iqamaId: user.iqamaId,

          phone: user.phone ?? null,

          isActive: user.isActive,

          role: "supervisor",

          isSupervisorSelf: true,

          workingNow: true,

          orders: {
            deliveredToday: 0,

            deliveredThisMonth: 0,
          },

          todayWork: {
            firstShiftStartedAt: null,

            lastShiftEndedAt: null,

            totalSeconds: 0,

            totalHours: 0,

            workingNow: true,
          },
        }
      : null;

  /*
   * Actual managed driver count.
   *
   * Supervisor is intentionally
   * not included here.
   */
  const totalDrivers = driverRows.length;

  const actualWorkingDrivers = driverRows.filter((driver) => driver.workingNow);

  const notWorkingDrivers = driverRows.filter((driver) => !driver.workingNow);

  /*
   * Preserve existing behavior:
   *
   * Supervisor appears in the
   * Working list when working.
   */
  const workingDrivers: DashboardDriverRow[] = supervisorWorkingRow
    ? [supervisorWorkingRow, ...actualWorkingDrivers]
    : actualWorkingDrivers;

  const allVisibleRows: DashboardDriverRow[] = supervisorWorkingRow
    ? [supervisorWorkingRow, ...driverRows]
    : driverRows;

  const workingCount = actualWorkingDrivers.length;

  const notWorkingCount = notWorkingDrivers.length;

  const visibleDrivers =
    selectedStat === "working"
      ? workingDrivers
      : selectedStat === "notStarted"
        ? notWorkingDrivers
        : allVisibleRows;

  const sectionTitle =
    selectedStat === "working"
      ? t("supervisor.workingNow", "Working")
      : selectedStat === "notStarted"
        ? t("supervisor.notWorking", "Not Working")
        : t("supervisor.drivers", "Drivers");

  return (
    <AppScreen>
      <View style={styles.screen}>
        <View style={styles.content}>
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
               * TOP STAT CARDS
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
               * DRIVER SECTION
               *
               * This takes remaining
               * available height.
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
                            "No drivers are working",
                          )
                        : selectedStat === "notStarted"
                          ? t(
                              "supervisor.allDriversStarted",
                              "All drivers are working",
                            )
                          : t("supervisor.noDrivers", "No drivers found")}
                    </Text>
                  </View>
                ) : (
                  /*
                   * ONLY THIS AREA SCROLLS.
                   *
                   * Quick actions below
                   * remain on screen.
                   */
                  <ScrollView
                    style={styles.driverList}
                    contentContainerStyle={styles.driverListContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    {visibleDrivers.map((driver) => (
                      <DriverRow key={driver._id} driver={driver} />
                    ))}
                  </ScrollView>
                )}
              </View>

              {/*
               * FIXED QUICK ACTIONS
               */}
              <View style={styles.quickActionsContainer}>
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
              </View>
            </>
          )}
        </View>
      </View>
    </AppScreen>
  );
}

function DriverRow({ driver }: { driver: DashboardDriverRow }) {
  const { t } = useTranslation();

  const driverId = driver._id;

  const isSupervisor = driver.isSupervisorSelf === true;

  const hasStarted = driver.workingNow;

  return (
    <Pressable
      disabled={!driverId || isSupervisor}
      onPress={() => {
        if (!driverId || isSupervisor) {
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
      {/*
       * DRIVER IDENTITY ROW
       */}
      <View style={styles.driverTopRow}>
        <View style={styles.driverAvatar}>
          {driver.profilePictureUrl ? (
            <Image
              source={{
                uri: driver.profilePictureUrl,
              }}
              style={styles.driverAvatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.driverAvatarText}>
              {driver.shortName?.trim().charAt(0).toUpperCase() ||
                driver.name?.trim().charAt(0).toUpperCase() ||
                "D"}
            </Text>
          )}
        </View>

        <View style={styles.driverInfo}>
          <Text style={styles.driverName} numberOfLines={1}>
            {driver.shortName || driver.name}

            {isSupervisor ? ` • ${t("common.you", "You")}` : ""}
          </Text>

          <Text style={styles.driverIqama} numberOfLines={1}>
            {driver.iqamaId}
          </Text>
        </View>

        {!isSupervisor && (
          <View style={styles.driverInfo}>
            <DriverMetric
              label={t("supervisor.deliveredToday", "Today")}
              value={String(driver.orders.deliveredToday)}
            />
          </View>
        )}

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
      </View>

      {/*
       * SUPERVISOR SPECIAL ROW:
       * don't show driver-specific
       * dashboard statistics.
       */}
      {!isSupervisor && (
        <View style={styles.driverMetrics}>
          {/* <DriverMetric
            label={t("supervisor.deliveredToday", "Today")}
            value={String(driver.orders.deliveredToday)}
          /> */}

          <DriverMetric
            label={t("supervisor.deliveredMonth", "Month")}
            value={String(driver.orders.deliveredThisMonth)}
          />

          <DriverMetric
            label={t("supervisor.firstShift", "Start")}
            value={formatTime(driver.todayWork.firstShiftStartedAt)}
          />

          <DriverMetric
            label={t("supervisor.lastShift", "Finish")}
            value={formatTime(driver.todayWork.lastShiftEndedAt)}
          />

          <DriverMetric
            label={t("supervisor.totalTime", "Total")}
            value={formatDuration(driver.todayWork.totalSeconds)}
          />
        </View>
      )}
    </Pressable>
  );
}

function DriverMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View style={styles.driverMetric}>
      <Text style={styles.driverMetricLabel} numberOfLines={1}>
        {label} :
      </Text>
      <Text style={styles.driverMetricValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
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

  /*
   * flex: 1 is important.
   *
   * The dashboard itself no
   * longer scrolls.
   */
  content: {
    flex: 1,

    width: "100%",
    maxWidth: 720,

    alignSelf: "center",

    paddingHorizontal: 14,

    paddingTop: 10,

    paddingBottom: 12,
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
    flex: 1,

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
   * TOP STATS
   */
  statsRow: {
    flexDirection: "row",

    gap: 7,

    marginBottom: 10,
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
   *
   * flex: 1 means it fills
   * remaining screen space.
   *
   * Quick actions remain below.
   */
  section: {
    flex: 1,

    minHeight: 0,

    paddingHorizontal: 10,

    paddingTop: 9,

    paddingBottom: 7,

    marginBottom: 10,

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

  /*
   * Independent driver scroll.
   */
  driverList: {
    flex: 1,

    minHeight: 0,
  },

  driverListContent: {
    flexGrow: 0,
  },

  /*
   * DRIVER ROW
   */
  driverRow: {
    minHeight: 82,

    paddingVertical: 7,

    borderBottomWidth: StyleSheet.hairlineWidth,

    // borderBottomColor: COLORS.border,
  },

  driverRowPressed: {
    opacity: 0.65,
  },

  driverTopRow: {
    flexDirection: "row",

    alignItems: "center",
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

  /*
   * DRIVER METRICS
   *
   * Today | Month | Start |
   * Finish | Total
   */
  driverMetrics: {
    flexDirection: "row",

    marginTop: 7,

    marginLeft: 5,

    paddingTop: 6,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: COLORS.border,
  },

  driverMetric: {
    flex: 1,

    minWidth: 0,

    alignItems: "center",
    flexDirection: "row",

    paddingHorizontal: 1,
  },

  driverMetricValue: {
    fontSize: 12,

    gap: 2,

    fontWeight: "800",

    color: COLORS.primary,

    textAlign: "center",
    marginLeft: 2,
  },

  driverMetricLabel: {
    marginTop: 2,

    fontSize: 8,

    fontWeight: "600",

    color: COLORS.muted,

    textAlign: "center",
  },

  emptyState: {
    flex: 1,

    paddingVertical: 14,

    alignItems: "center",

    justifyContent: "center",
  },

  emptyText: {
    fontSize: 9,

    color: COLORS.muted,

    textAlign: "center",
  },

  /*
   * QUICK ACTIONS
   *
   * This container is outside
   * driver ScrollView, therefore
   * it remains visible.
   */
  quickActionsContainer: {
    flexShrink: 0,
    paddingBottom: 20,
  },

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
  driverAvatarImage: {
    width: "100%",

    height: "100%",

    borderRadius: 16,
  },
});
