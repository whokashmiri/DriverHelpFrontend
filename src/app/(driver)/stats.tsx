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

import { AppScreen } from "../../components/AppScreen";

import { getMyDashboardStats } from "../../api/statsApi";

import { useAuth } from "../../hooks/useAuth";

import { useLanguage } from "../../context/LanguageContext";

import type { MyDashboardStatsResponse } from "../../types/stats";

import { formatDuration, getErrorMessage } from "../../utils";

export default function StatsScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const { language, setLanguage } = useLanguage();

  const [data, setData] = useState<MyDashboardStatsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyDashboardStats();

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
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t("common.back", "Back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("stats.title", "Statistics")}</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : data ? (
          <>
            <PeriodCard
              title={t("stats.today", "Today")}
              orders={data.stats.today.orders.total}
              delivered={data.stats.today.orders.delivered}
              workingSeconds={data.stats.today.work.totalSeconds}
              language={language}
            />

            <PeriodCard
              title={t("stats.week", "This Week")}
              orders={data.stats.week.orders.total}
              delivered={data.stats.week.orders.delivered}
              workingSeconds={data.stats.week.work.totalSeconds}
              language={language}
            />

            <PeriodCard
              title={t("stats.month", "This Month")}
              orders={data.stats.month.orders.total}
              delivered={data.stats.month.orders.delivered}
              workingSeconds={data.stats.month.work.totalSeconds}
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
  orders,
  delivered,
  workingSeconds,
  language,
}: {
  title: string;
  orders: number;
  delivered: number;
  workingSeconds: number;
  language: "ar" | "en";
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>

      <View style={styles.statsRow}>
        <StatValue label={t("stats.orders", "Orders")} value={String(orders)} />

        <StatValue
          label={t("stats.delivered", "Delivered")}
          value={String(delivered)}
        />
      </View>

      <View style={styles.workContainer}>
        <Text style={styles.workLabel}>
          {t("stats.workingTime", "Working Time")}
        </Text>

        <Text style={styles.workValue}>
          {formatDuration(workingSeconds, language)}
        </Text>
      </View>
    </View>
  );
}

function StatValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  content: {
    padding: 18,
    paddingBottom: 40,
  },

  back: {
    fontWeight: "700",
    color: "#374151",
    marginBottom: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },

  card: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 18,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
  },

  statItem: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
  },

  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  statLabel: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },

  workContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },

  workLabel: {
    color: "#6B7280",
    fontSize: 12,
  },

  workValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },

  errorText: {
    color: "#B91C1C",
  },
});
