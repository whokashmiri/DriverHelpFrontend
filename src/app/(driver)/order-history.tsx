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

import { getMyOrders } from "../../api/orderApi";

import { useAuth } from "../../hooks/useAuth";

import { useLanguage } from "../../context/LanguageContext";

import type { Order } from "../../types/order";

import { formatDateTime, formatDuration, getErrorMessage } from "../../utils";

export default function OrderHistoryScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const { language, setLanguage } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyOrders();

      setOrders(response.orders);
    } catch (err) {
      setError(
        getErrorMessage(err, t("orders.loadFailed", "Unable to load orders")),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <AppScreen

    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t("common.back", "Back")}</Text>
        </Pressable>

        <Text style={styles.title}>{t("orders.history", "Order History")}</Text>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : orders.length === 0 ? (
          <Text style={styles.emptyText}>
            {t("orders.empty", "No orders found")}
          </Text>
        ) : (
          orders.map((order) => (
            <View key={order._id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.status}>
                  {order.status === "delivered"
                    ? t("orders.delivered", "Delivered")
                    : t("orders.pickedUp", "Picked up")}
                </Text>

                <Text style={styles.date}>
                  {formatDateTime(order.createdAt, language)}
                </Text>
              </View>

              <Text style={styles.detail}>
                {t("orders.pickup", "Pickup")}:{" "}
                {formatDateTime(order.pickupTime, language)}
              </Text>

              {order.deliveryTime && (
                <Text style={styles.detail}>
                  {t("orders.delivery", "Delivery")}:{" "}
                  {formatDateTime(order.deliveryTime, language)}
                </Text>
              )}

              {order.durationSeconds !== null && (
                <Text style={styles.detail}>
                  {t("orders.duration", "Duration")}:{" "}
                  {formatDuration(order.durationSeconds, language)}
                </Text>
              )}

              {!!order.notes && <Text style={styles.notes}>{order.notes}</Text>}
            </View>
          ))
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
    color: "#374151",
    fontWeight: "700",
    marginBottom: 14,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  status: {
    fontWeight: "800",
    color: "#111827",
  },

  date: {
    fontSize: 12,
    color: "#6B7280",
  },

  detail: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 5,
  },

  notes: {
    marginTop: 8,
    color: "#374151",
  },

  emptyText: {
    color: "#6B7280",
    marginTop: 20,
  },

  errorText: {
    color: "#B91C1C",
    marginTop: 20,
  },
});
