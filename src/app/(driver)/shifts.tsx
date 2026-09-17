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

import { getMyShifts } from "../../api/shiftApi";

import { useAuth } from "../../hooks/useAuth";

import { useLanguage } from "../../context/LanguageContext";

import type { DriverShift } from "../../types/shift";

import {
  formatDateTime,
  formatDuration,
  getElapsedSeconds,
  getErrorMessage,
} from "../../utils";

export default function ShiftsScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const { language, setLanguage } = useLanguage();

  const [shifts, setShifts] = useState<DriverShift[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadShifts = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyShifts();

      setShifts(response.shifts);
    } catch (err) {
      setError(
        getErrorMessage(err, t("shifts.loadFailed", "Unable to load shifts")),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadShifts();
  }, [loadShifts]);

  return (
    <AppScreen>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t("common.back", "Back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("shifts.history", "Shift History")}</Text>

        {isLoading ? (
          <ActivityIndicator />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : shifts.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("shifts.empty", "No shifts found")}
          </Text>
        ) : (
          shifts.map((shift) => {
            const duration =
              shift.status === "active"
                ? getElapsedSeconds(shift.startedAt)
                : (shift.durationSeconds ?? 0);

            return (
              <View key={shift._id ?? shift.id} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.status}>
                    {shift.status === "active"
                      ? t("shifts.active", "Active")
                      : t("shifts.completed", "Completed")}
                  </Text>

                  <Text style={styles.duration}>
                    {formatDuration(duration, language)}
                  </Text>
                </View>

                <Text style={styles.detail}>
                  {t("shifts.start", "Start")}:{" "}
                  {formatDateTime(shift.startedAt, language)}
                </Text>

                {shift.endedAt && (
                  <Text style={styles.detail}>
                    {t("shifts.end", "End")}:{" "}
                    {formatDateTime(shift.endedAt, language)}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </AppScreen>
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
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  status: {
    fontWeight: "800",
    color: "#111827",
  },

  duration: {
    fontWeight: "700",
    color: "#374151",
  },

  detail: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },

  errorText: {
    color: "#B91C1C",
  },

  emptyText: {
    color: "#6B7280",
  },
});
