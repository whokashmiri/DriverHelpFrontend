import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";

import { CalendarDays, ChevronDown, X } from "lucide-react-native";

import {
  getSupervisorDashboardStats,
  getSupervisorRangeStats,
} from "../../api/statsApi";

import { getMyDrivers } from "../../api/driverApi";

import { AppScreen } from "../../components/AppScreen";

import { useLanguage } from "../../context/LanguageContext";

import type { Driver } from "../../types/driver";

import type {
  SupervisorDashboardStatsResponse,
  SupervisorRangeStatsResponse,
} from "../../types/stats";

import { formatDuration, getErrorMessage } from "../../utils";

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
  successLight: "#EAF7EE",
};

type DriverFilterValue = "all" | string;

export default function SupervisorStatsScreen() {
  const { t } = useTranslation();

  const { language } = useLanguage();

  const [data, setData] = useState<SupervisorDashboardStatsResponse | null>(
    null,
  );

  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [rangeStats, setRangeStats] =
    useState<SupervisorRangeStatsResponse | null>(null);

  const [selectedDriverId, setSelectedDriverId] =
    useState<DriverFilterValue>("all");

  const [driverModalVisible, setDriverModalVisible] = useState(false);

  const [fromDate, setFromDate] = useState(getDefaultFromDate());

  const [toDate, setToDate] = useState(getTodayDate());

  const [isLoading, setIsLoading] = useState(true);

  const [isFiltering, setIsFiltering] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [filterError, setFilterError] = useState<string | null>(null);

  const selectedDriver = useMemo(() => {
    if (selectedDriverId === "all") {
      return null;
    }

    return (
      drivers.find((driver) => getDriverId(driver) === selectedDriverId) ?? null
    );
  }, [drivers, selectedDriverId]);

  const loadStats = useCallback(async () => {
    try {
      setError(null);

      const [statsResponse, driversResponse] = await Promise.all([
        getSupervisorDashboardStats(),

        getMyDrivers(),
      ]);

      setData(statsResponse);

      setDrivers(driversResponse.drivers ?? []);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("stats.loadFailed", "Unable to load statistics"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleApplyFilter = async () => {
    try {
      setFilterError(null);

      if (!isValidDateString(fromDate) || !isValidDateString(toDate)) {
        setFilterError(t("stats.invalidDate", "Use date format YYYY-MM-DD"));

        return;
      }

      const from = new Date(`${fromDate}T00:00:00`);

      const to = new Date(`${toDate}T00:00:00`);

      if (to.getTime() < from.getTime()) {
        setFilterError(
          t("stats.invalidRange", "To date cannot be before From date"),
        );

        return;
      }

      setIsFiltering(true);

      const response = await getSupervisorRangeStats(
        fromDate,
        toDate,

        selectedDriverId === "all" ? undefined : selectedDriverId,
      );

      setRangeStats(response);
    } catch (err) {
      setFilterError(
        getErrorMessage(
          err,
          t("stats.rangeLoadFailed", "Unable to load filtered statistics"),
        ),
      );
    } finally {
      setIsFiltering(false);
    }
  };

  const handleResetFilter = () => {
    setSelectedDriverId("all");

    setFromDate(getDefaultFromDate());

    setToDate(getTodayDate());

    setRangeStats(null);

    setFilterError(null);
  };

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text style={styles.title}>{t("stats.title", "Statistics")}</Text>

          <Text style={styles.subtitle}>
            {t(
              "stats.supervisorSubtitle",
              "Monitor driver activity and work performance",
            )}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            <View style={styles.driverGrid}>
              <SummaryCard
                label={t("supervisor.totalDrivers", "Drivers")}
                value={String(data.drivers.total)}
              />

              <SummaryCard
                label={t("supervisor.workingNow", "Working Now")}
                value={String(data.drivers.workingNow)}
              />
            </View>

            <CustomFilterCard
              fromDate={fromDate}
              toDate={toDate}
              setFromDate={setFromDate}
              setToDate={setToDate}
              selectedDriver={selectedDriver}
              onOpenDriver={() => setDriverModalVisible(true)}
              onApply={() => void handleApplyFilter()}
              onReset={handleResetFilter}
              loading={isFiltering}
              error={filterError}
            />

            {rangeStats && (
              <FilteredStatsCard
                stats={rangeStats}
                language={language}
                selectedDriver={selectedDriver}
              />
            )}

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerText}>
                {t("stats.quickOverview", "Quick Overview")}
              </Text>
            </View>

            <PeriodCard
              title={t("stats.today", "Today")}
              data={data.stats.today}
              language={language}
            />

            <PeriodCard
              title={t("stats.week", "This Week")}
              data={data.stats.week}
              language={language}
            />

            <PeriodCard
              title={t("stats.month", "This Month")}
              data={data.stats.month}
              language={language}
            />
          </>
        ) : null}
      </ScrollView>

      <DriverFilterModal
        visible={driverModalVisible}
        drivers={drivers}
        selectedDriverId={selectedDriverId}
        onClose={() => setDriverModalVisible(false)}
        onSelect={(driverId) => {
          setSelectedDriverId(driverId);

          setDriverModalVisible(false);
        }}
      />
    </AppScreen>
  );
}

function CustomFilterCard({
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  selectedDriver,
  onOpenDriver,
  onApply,
  onReset,
  loading,
  error,
}: {
  fromDate: string;

  toDate: string;

  setFromDate: (value: string) => void;

  setToDate: (value: string) => void;

  selectedDriver: Driver | null;

  onOpenDriver: () => void;

  onApply: () => void;

  onReset: () => void;

  loading: boolean;

  error: string | null;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.filterCard}>
      <View style={styles.filterHeader}>
        <View style={styles.filterHeaderIcon}>
          <CalendarDays size={15} color={COLORS.primary} />
        </View>

        <View style={styles.filterHeaderText}>
          <Text style={styles.filterTitle}>
            {t("stats.customRange", "Custom Report")}
          </Text>

          <Text style={styles.filterSubtitle}>
            {t("stats.customRangeSubtitle", "Filter by dates and driver")}
          </Text>
        </View>

        <Pressable onPress={onReset} style={styles.resetButton}>
          <Text style={styles.resetText}>{t("common.reset", "Reset")}</Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>{t("stats.driver", "Driver")}</Text>

      <Pressable
        onPress={onOpenDriver}
        style={({ pressed }) => [
          styles.selector,

          pressed && styles.selectorPressed,
        ]}
      >
        <View style={styles.selectorContent}>
          <Text style={styles.selectorPrimary} numberOfLines={1}>
            {selectedDriver
              ? selectedDriver.name
              : t("stats.wholeTeam", "Whole Team")}
          </Text>

          {selectedDriver ? (
            <Text style={styles.selectorSecondary} numberOfLines={1}>
              {t("profile.iqama", "Iqama")}: {selectedDriver.iqamaId}
            </Text>
          ) : (
            <Text style={styles.selectorSecondary}>
              {t("stats.allDrivers", "All drivers")}
            </Text>
          )}
        </View>

        <ChevronDown size={16} color={COLORS.muted} />
      </Pressable>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>{t("stats.from", "From")}</Text>

          <View style={styles.dateInputBox}>
            <CalendarDays size={13} color={COLORS.secondary} />

            <TextInput
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={styles.dateInput}
            />
          </View>
        </View>

        <View style={styles.dateField}>
          <Text style={styles.fieldLabel}>{t("stats.to", "To")}</Text>

          <View style={styles.dateInputBox}>
            <CalendarDays size={13} color={COLORS.secondary} />

            <TextInput
              value={toDate}
              onChangeText={setToDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              style={styles.dateInput}
            />
          </View>
        </View>
      </View>

      {!!error && (
        <View style={styles.filterErrorBox}>
          <Text style={styles.filterErrorText}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={onApply}
        disabled={loading}
        style={({ pressed }) => [
          styles.applyButton,

          pressed && styles.applyButtonPressed,

          loading && styles.applyButtonDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.applyButtonText}>
            {t("stats.applyFilter", "Apply Filter")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function FilteredStatsCard({
  stats,
  language,
  selectedDriver,
}: {
  stats: SupervisorRangeStatsResponse;

  language: "ar" | "en";

  selectedDriver: Driver | null;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.filteredCard}>
      <View style={styles.filteredHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filteredTitle}>
            {selectedDriver
              ? selectedDriver.name
              : t("stats.wholeTeam", "Whole Team")}
          </Text>

          <Text style={styles.filteredRange}>
            {stats.range.from}
            {"  →  "}
            {stats.range.to}
          </Text>
        </View>

        <View style={styles.scopeBadge}>
          <Text style={styles.scopeBadgeText}>
            {stats.scope === "driver"
              ? t("stats.driver", "Driver")
              : t("stats.team", "Team")}
          </Text>
        </View>
      </View>

      <View style={styles.filteredGrid}>
        <FilteredMetric
          label={t("stats.orders", "Orders")}
          value={String(stats.orders.total)}
        />

        <FilteredMetric
          label={t("stats.delivered", "Delivered")}
          value={String(stats.orders.delivered)}
        />
        <FilteredMetric
          label={t("stats.cancelled", "Cancelled")}
          value={String(stats.orders.cancelled)}
        />

        <FilteredMetric
          label={t("stats.activeOrders", "Active")}
          value={String(stats.orders.pickedUp)}
        />
      </View>

      <View style={styles.filteredWorkBox}>
        <Text style={styles.filteredWorkLabel}>
          {t("stats.workingTime", "Working Time")}
        </Text>

        <Text style={styles.filteredWorkValue}>
          {formatDuration(stats.work.totalSeconds, language)}
        </Text>
      </View>

      {stats.scope === "team" && stats.drivers.mode === "team" && (
        <View style={styles.teamInfoRow}>
          <Text style={styles.teamInfoText}>
            {t("supervisor.totalDrivers", "Drivers")}: {stats.drivers.total}
          </Text>

          <Text style={styles.teamInfoText}>
            {t("supervisor.workingNow", "Working Now")}:{" "}
            {stats.drivers.workingNow}
          </Text>
        </View>
      )}
    </View>
  );
}

function FilteredMetric({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View style={styles.filteredMetric}>
      <Text style={styles.filteredMetricValue}>{value}</Text>

      <Text style={styles.filteredMetricLabel}>{label}</Text>
    </View>
  );
}

function DriverFilterModal({
  visible,
  drivers,
  selectedDriverId,
  onClose,
  onSelect,
}: {
  visible: boolean;

  drivers: Driver[];

  selectedDriverId: DriverFilterValue;

  onClose: () => void;

  onSelect: (driverId: DriverFilterValue) => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {t("stats.selectDriver", "Select Driver")}
              </Text>

              <Text style={styles.modalSubtitle}>
                {t(
                  "stats.selectDriverDescription",
                  "Choose one driver or the whole team",
                )}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.modalClose}>
              <X size={16} color={COLORS.primary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.driverList}
            showsVerticalScrollIndicator={false}
          >
            <DriverOption
              title={t("stats.wholeTeam", "Whole Team")}
              subtitle={t("stats.allDrivers", "All drivers")}
              selected={selectedDriverId === "all"}
              onPress={() => onSelect("all")}
            />

            {drivers.map((driver) => {
              const id = getDriverId(driver);

              if (!id) {
                return null;
              }

              return (
                <DriverOption
                  key={id}
                  title={driver.name}
                  subtitle={`${t("profile.iqama", "Iqama")}: ${driver.iqamaId}`}
                  selected={selectedDriverId === id}
                  onPress={() => onSelect(id)}
                />
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DriverOption({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;

  subtitle: string;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.driverOption,

        selected && styles.driverOptionSelected,

        pressed && styles.driverOptionPressed,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.driverOptionTitle}>{title}</Text>

        <Text style={styles.driverOptionSubtitle}>{subtitle}</Text>
      </View>

      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

function PeriodCard({
  title,
  data,
  language,
}: {
  title: string;

  data: SupervisorDashboardStatsResponse["stats"]["today"];

  language: "ar" | "en";
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.periodCard}>
      <View style={styles.periodHeader}>
        <Text style={styles.periodTitle}>{title}</Text>

        <View style={styles.periodAccent} />
      </View>

      <View style={styles.row}>
        <MetricCard
          label={t("stats.orders", "Orders")}
          value={String(data.orders.total)}
        />

        <MetricCard
          label={t("stats.delivered", "Delivered")}
          value={String(data.orders.delivered)}
        />

             <MetricCard
          label={t("stats.cancelled", "Cancelled")}
          value={String(data.orders.cancelled)}
        />
      </View>

      <View style={styles.workBox}>
      
        <Text style={styles.workLabel}>
          {t("stats.workingTime", "Working Time")}
        </Text>

      

        <Text style={styles.workValue}>
          {formatDuration(data.work.totalSeconds, language)}
        </Text>

       
      </View>
    </View>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>

      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getDriverId(driver: Driver) {
  return driver._id ?? driver.id ?? null;
}

function getTodayDate() {
  const now = new Date();

  return formatInputDate(now);
}

function getDefaultFromDate() {
  const date = new Date();

  date.setDate(date.getDate() - 6);

  return formatInputDate(date);
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00`);

  return !Number.isNaN(date.getTime());
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

    marginBottom: 5,
  },

  backText: {
    fontSize: 12,

    fontWeight: "700",

    color: COLORS.secondary,
  },

  heading: {
    marginBottom: 10,
  },

  title: {
    fontSize: 21,

    fontWeight: "900",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 2,

    fontSize: 11,

    lineHeight: 15,

    color: COLORS.muted,
  },

  loading: {
    minHeight: 120,

    alignItems: "center",

    justifyContent: "center",
  },

  errorBox: {
    paddingHorizontal: 10,

    paddingVertical: 8,

    borderRadius: 9,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    fontSize: 10,

    lineHeight: 14,

    color: COLORS.error,
  },

  driverGrid: {
    flexDirection: "row",

    gap: 7,

    marginBottom: 8,
  },

  summaryCard: {
    flex: 1,

    minHeight: 62,

    paddingHorizontal: 10,

    paddingVertical: 8,

    borderRadius: 10,

    backgroundColor: COLORS.primary,

    justifyContent: "center",
  },

  summaryValue: {
    fontSize: 18,

    fontWeight: "900",

    color: COLORS.white,
  },

  summaryLabel: {
    marginTop: 1,

    fontSize: 8,

    fontWeight: "600",

    color: "#D9E6E7",
  },

  filterCard: {
    padding: 10,

    marginBottom: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 12,

    backgroundColor: COLORS.white,
  },

  filterHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 10,
  },

  filterHeaderIcon: {
    width: 30,

    height: 30,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  filterHeaderText: {
    flex: 1,

    marginLeft: 7,
  },

  filterTitle: {
    fontSize: 12,

    fontWeight: "900",

    color: COLORS.primary,
  },

  filterSubtitle: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  resetButton: {
    paddingHorizontal: 8,

    paddingVertical: 5,

    borderRadius: 7,

    backgroundColor: COLORS.light,
  },

  resetText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.secondary,
  },

  fieldLabel: {
    marginBottom: 4,

    fontSize: 8,

    fontWeight: "700",

    color: COLORS.muted,
  },

  selector: {
    minHeight: 42,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 10,

    marginBottom: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  selectorPressed: {
    opacity: 0.7,
  },

  selectorContent: {
    flex: 1,

    minWidth: 0,
  },

  selectorPrimary: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.primary,
  },

  selectorSecondary: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },

  dateField: {
    flex: 1,
  },

  dateInputBox: {
    height: 38,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 8,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  dateInput: {
    flex: 1,

    marginLeft: 6,

    paddingVertical: 0,

    fontSize: 9,

    fontWeight: "700",

    color: COLORS.black,
  },

  filterErrorBox: {
    marginTop: 7,

    paddingHorizontal: 8,

    paddingVertical: 6,

    borderRadius: 7,

    backgroundColor: COLORS.errorBackground,
  },

  filterErrorText: {
    fontSize: 9,

    color: COLORS.error,
  },

  applyButton: {
    height: 36,

    marginTop: 9,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.primary,
  },

  applyButtonPressed: {
    opacity: 0.8,
  },

  applyButtonDisabled: {
    opacity: 0.55,
  },

  applyButtonText: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.white,
  },

  filteredCard: {
    padding: 10,

    marginBottom: 10,

    borderWidth: 1,

    borderColor: COLORS.secondary,

    borderRadius: 12,

    backgroundColor: COLORS.white,
  },

  filteredHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 8,
  },

  filteredTitle: {
    fontSize: 12,

    fontWeight: "900",

    color: COLORS.primary,
  },

  filteredRange: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  scopeBadge: {
    paddingHorizontal: 7,

    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: COLORS.successLight,
  },

  scopeBadgeText: {
    fontSize: 7,

    fontWeight: "900",

    color: COLORS.success,
  },

  filteredGrid: {
    flexDirection: "row",
    flexWrap: "wrap",

    gap: 6,
  },

  filteredMetric: {
    flex: 1,

    minHeight: 54,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 4,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  filteredMetricValue: {
    fontSize: 15,

    fontWeight: "900",

    color: COLORS.primary,
  },

  filteredMetricLabel: {
    marginTop: 2,

    fontSize: 7,

    color: COLORS.muted,

    textAlign: "center",
  },

  filteredWorkBox: {
    marginTop: 7,

    paddingHorizontal: 9,

    paddingVertical: 7,

    borderRadius: 8,

    backgroundColor: COLORS.light,

    borderLeftWidth: 3,

    borderLeftColor: COLORS.secondary,
  },

  filteredWorkLabel: {
    fontSize: 8,

    color: COLORS.muted,
  },

  filteredWorkValue: {
    marginTop: 1,

    fontSize: 13,

    fontWeight: "900",

    color: COLORS.primary,
  },

  teamInfoRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    marginTop: 7,

    paddingTop: 7,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: COLORS.border,
  },

  teamInfoText: {
    fontSize: 8,

    fontWeight: "700",

    color: COLORS.muted,
  },

  sectionDivider: {
    marginTop: 2,

    marginBottom: 7,
  },

  sectionDividerText: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.primary,
  },

  periodCard: {
    padding: 11,

    borderRadius: 12,

    backgroundColor: COLORS.white,

    borderWidth: 1,

    borderColor: COLORS.border,

    marginBottom: 8,
  },

  periodHeader: {
    marginBottom: 8,
  },

  periodTitle: {
    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  periodAccent: {
    width: 24,

    height: 3,

    marginTop: 4,

    borderRadius: 2,

    backgroundColor: COLORS.secondary,
  },

  row: {
    flexDirection: "row",

    gap: 7,
  },

  metricCard: {
    flex: 1,
    width: "31%",
    minHeight: 58,

    paddingHorizontal: 10,

    paddingVertical: 9,

    borderRadius: 9,

    backgroundColor: COLORS.light,

    borderWidth: 1,

    borderColor: COLORS.border,

    justifyContent: "center",
  },

  metricValue: {
    fontSize: 17,

    fontWeight: "900",

    color: COLORS.primary,
  },

  metricLabel: {
    marginTop: 2,

    fontSize: 9,

    fontWeight: "600",

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

    fontWeight: "600",

    color: COLORS.muted,
  },

  workValue: {
    marginTop: 2,

    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  modalBackdrop: {
    flex: 1,

    justifyContent: "flex-end",

    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },

  modalCard: {
    maxHeight: "70%",

    paddingHorizontal: 12,

    paddingTop: 12,

    paddingBottom: 20,

    borderTopLeftRadius: 18,

    borderTopRightRadius: 18,

    backgroundColor: COLORS.white,
  },

  modalHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 10,
  },

  modalTitle: {
    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  modalSubtitle: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  modalClose: {
    width: 30,

    height: 30,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  driverList: {
    maxHeight: 400,
  },

  driverOption: {
    minHeight: 48,

    flexDirection: "row",

    alignItems: "center",

    paddingHorizontal: 10,

    paddingVertical: 7,

    marginBottom: 6,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  driverOptionSelected: {
    borderColor: COLORS.secondary,

    backgroundColor: "#E5F1F2",
  },

  driverOptionPressed: {
    opacity: 0.7,
  },

  driverOptionTitle: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.primary,
  },

  driverOptionSubtitle: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  radioOuter: {
    width: 17,

    height: 17,

    marginLeft: 8,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 9,
  },

  radioOuterSelected: {
    borderColor: COLORS.secondary,
  },

  radioInner: {
    width: 9,

    height: 9,

    borderRadius: 5,

    backgroundColor: COLORS.secondary,
  },
});
