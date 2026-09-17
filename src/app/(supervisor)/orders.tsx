import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

import { getSupervisorActiveOrders } from "../../api/orderApi";

import { getErrorMessage } from "../../utils";

import type { Order } from "../../types/order";

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

export default function SupervisorOrdersScreen() {
  const { t } = useTranslation();

  const [orders, setOrders] = useState<Order[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);

      const response = await getSupervisorActiveOrders();

      setOrders(response.orders ?? []);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("orders.loadFailed", "Unable to load active orders"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

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
          <View style={styles.headingLeft}>
            <Text style={styles.title}>
              {t("orders.activeOrders", "Active Orders")}
            </Text>

            <Text style={styles.subtitle}>
              {t(
                "orders.supervisorSubtitle",
                "View active orders from your drivers",
              )}
            </Text>
          </View>

          {!isLoading && (
            <View style={styles.countBadge}>
              <Text style={styles.countValue}>{orders.length}</Text>

              <Text style={styles.countLabel}>
                {t("orders.active", "Active")}
              </Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />

            <Text style={styles.loadingText}>
              {t("orders.loading", "Loading active orders...")}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable
              onPress={() => {
                setIsLoading(true);
                void loadOrders();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.retryText}>{t("common.retry", "Retry")}</Text>
            </Pressable>
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>O</Text>
            </View>

            <Text style={styles.emptyTitle}>
              {t("orders.noActiveOrders", "No active orders")}
            </Text>

            <Text style={styles.emptyText}>
              {t(
                "orders.noActiveOrdersDescription",
                "Your drivers currently have no active pickup orders.",
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {orders.map((order) => {
              const rider =
                typeof order.rider === "string" ? null : order.rider;

              return (
                <Pressable
                  key={order._id}
                  onPress={() => {
                    if (!rider?._id) {
                      return;
                    }

                    router.push({
                      pathname: "/(supervisor)/driver-details",

                      params: {
                        driverId: rider._id,
                      },
                    });
                  }}
                  style={({ pressed }) => [
                    styles.orderCard,
                    pressed && styles.orderCardPressed,
                  ]}
                >
                  {order.pickupPhoto?.url ? (
                    <Image
                      source={{
                        uri: order.pickupPhoto.url,
                      }}
                      style={styles.orderImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.orderImagePlaceholder}>
                      <Text style={styles.orderImageText}>O</Text>
                    </View>
                  )}

                  <View style={styles.orderInfo}>
                    <View style={styles.orderTopRow}>
                      <Text style={styles.driverName} numberOfLines={1}>
                        {rider?.name ?? t("drivers.driver", "Driver")}
                      </Text>

                      <View style={styles.activeBadge}>
                        <View style={styles.activeDot} />

                        <Text style={styles.activeText}>
                          {t("orders.active", "Active")}
                        </Text>
                      </View>
                    </View>

                    {!!rider?.iqamaId && (
                      <Text style={styles.driverSub} numberOfLines={1}>
                        {t("profile.iqama", "Iqama")}: {rider.iqamaId}
                      </Text>
                    )}

                    {!!rider?.name && (
                      <Text style={styles.driverPhone} numberOfLines={1}>
                        {rider.name}
                      </Text>
                    )}

                    <Text style={styles.pickupTime}>
                      {t("orders.pickupTime", "Pickup")}:{" "}
                      {formatOrderTime(order.pickupTime)}
                    </Text>

                    {!!order.notes?.trim() && (
                      <Text style={styles.notes} numberOfLines={2}>
                        {order.notes}
                      </Text>
                    )}
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function formatOrderTime(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
    marginBottom: 6,
  },

  backText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  heading: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 10,
  },

  headingLeft: {
    flex: 1,
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

  countBadge: {
    minWidth: 46,
    height: 38,

    marginLeft: 10,
    paddingHorizontal: 8,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.primary,
  },

  countValue: {
    fontSize: 13,
    fontWeight: "900",

    color: COLORS.white,
  },

  countLabel: {
    marginTop: -1,

    fontSize: 7,
    fontWeight: "700",

    color: "#D9E6E7",
  },

  loading: {
    minHeight: 120,

    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 6,

    fontSize: 10,

    color: COLORS.muted,
  },

  errorBox: {
    padding: 10,

    borderRadius: 9,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    fontSize: 10,
    lineHeight: 14,

    color: COLORS.error,
  },

  retryButton: {
    height: 32,

    marginTop: 8,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.primary,
  },

  retryText: {
    fontSize: 10,
    fontWeight: "800",

    color: COLORS.white,
  },

  emptyCard: {
    minHeight: 150,

    paddingHorizontal: 18,
    paddingVertical: 18,

    borderRadius: 12,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    alignItems: "center",
    justifyContent: "center",
  },

  iconCircle: {
    width: 40,
    height: 40,

    borderRadius: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,

    marginBottom: 8,
  },

  iconText: {
    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",

    color: COLORS.primary,

    textAlign: "center",
  },

  emptyText: {
    maxWidth: 280,

    marginTop: 4,

    fontSize: 10,
    lineHeight: 15,

    color: COLORS.muted,

    textAlign: "center",
  },

  list: {
    gap: 6,
  },

  orderCard: {
    minHeight: 72,

    flexDirection: "row",
    alignItems: "center",

    padding: 8,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,
  },

  orderCardPressed: {
    opacity: 0.7,
  },

  orderImage: {
    width: 54,
    height: 54,

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  orderImagePlaceholder: {
    width: 54,
    height: 54,

    borderRadius: 8,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.light,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  orderImageText: {
    fontSize: 15,
    fontWeight: "900",

    color: COLORS.primary,
  },

  orderInfo: {
    flex: 1,

    minWidth: 0,

    marginLeft: 9,
  },

  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  driverName: {
    flex: 1,

    fontSize: 12,
    fontWeight: "800",

    color: COLORS.black,
  },

  activeBadge: {
    marginLeft: 6,

    paddingHorizontal: 6,
    paddingVertical: 3,

    flexDirection: "row",
    alignItems: "center",

    borderRadius: 999,

    backgroundColor: COLORS.successBackground,
  },

  activeDot: {
    width: 5,
    height: 5,

    marginRight: 4,

    borderRadius: 3,

    backgroundColor: COLORS.success,
  },

  activeText: {
    fontSize: 7,
    fontWeight: "800",

    color: COLORS.success,
  },

  driverSub: {
    marginTop: 2,

    fontSize: 9,

    color: COLORS.secondary,
  },

  driverPhone: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  pickupTime: {
    marginTop: 2,

    fontSize: 8,
    fontWeight: "600",

    color: COLORS.muted,
  },

  notes: {
    marginTop: 3,

    fontSize: 8,
    lineHeight: 11,

    color: COLORS.black,
  },

  chevron: {
    marginLeft: 5,

    fontSize: 20,
    fontWeight: "400",

    color: COLORS.muted,
  },

  buttonPressed: {
    opacity: 0.7,
  },
});
