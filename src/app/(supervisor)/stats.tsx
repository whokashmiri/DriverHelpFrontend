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

import { getSupervisorDashboardStats } from "../../api/statsApi";
import { AppScreen } from "../../components/AppScreen";

import { useLanguage } from "../../context/LanguageContext";

import type { SupervisorDashboardStatsResponse } from "../../types/stats";

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
};

export default function SupervisorStatsScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const [data, setData] = useState<SupervisorDashboardStatsResponse | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);

      const response = await getSupervisorDashboardStats();

      setData(response);
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
    </AppScreen>
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

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryValue}>{value}</Text>

      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>

      <Text style={styles.metricLabel}>{label}</Text>
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

  loading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },

  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    fontSize: 13,
    color: COLORS.error,
  },

  driverGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    minHeight: 90,

    paddingHorizontal: 14,
    paddingVertical: 14,

    borderRadius: 14,

    backgroundColor: COLORS.primary,

    justifyContent: "center",
  },

  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.white,
  },

  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    color: "#D9E6E7",
  },

  periodCard: {
    padding: 15,

    borderRadius: 16,

    backgroundColor: COLORS.white,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 12,
  },

  periodHeader: {
    marginBottom: 12,
  },

  periodTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: COLORS.primary,
  },

  periodAccent: {
    width: 30,
    height: 4,

    marginTop: 7,

    borderRadius: 2,

    backgroundColor: COLORS.secondary,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  metricCard: {
    flex: 1,

    minHeight: 78,

    paddingHorizontal: 12,
    paddingVertical: 12,

    borderRadius: 12,

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  metricValue: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.primary,
  },

  metricLabel: {
    marginTop: 4,

    fontSize: 11,
    fontWeight: "600",

    color: COLORS.muted,
  },

  workBox: {
    marginTop: 10,

    paddingHorizontal: 13,
    paddingVertical: 12,

    borderRadius: 12,

    backgroundColor: COLORS.light,

    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },

  workLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.muted,
  },

  workValue: {
    marginTop: 3,

    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,
  },
});
