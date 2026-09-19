import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { router, useFocusEffect } from "expo-router";

import { useTranslation } from "react-i18next";

import { AppScreen } from "../../components/AppScreen";

import {
  completeOrderDelivery,
  createPickupOrder,
  getActiveOrder,
} from "../../api/orderApi";

import type { Order, OrderPhotoInput } from "../../types/order";

import { useLanguage } from "../../context/LanguageContext";

import { formatDateTime, getErrorMessage } from "../../utils";

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

export default function NewOrderScreen() {
  const { t } = useTranslation();

  const { language } = useLanguage();

  const isArabic = language === "ar";

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [pickupPhoto, setPickupPhoto] = useState<OrderPhotoInput | null>(null);

  const [deliveryPhoto, setDeliveryPhoto] = useState<OrderPhotoInput | null>(
    null,
  );

  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [uploadingPickup, setUploadingPickup] = useState(false);

  const [uploadingDelivery, setUploadingDelivery] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadActiveOrder = useCallback(async () => {
    try {
      setError(null);

      const response = await getActiveOrder();

      const order = response.order;

      setActiveOrder(order);

      if (!order) {
        setPickupPhoto(null);
        setDeliveryPhoto(null);
        setElapsedSeconds(0);

        return;
      }

      if (order.pickupPhoto?.url) {
        setPickupPhoto({
          uri: order.pickupPhoto.url,

          time: safeDate(order.pickupPhoto.takenAt || order.pickupTime),
        });
      }

      if (order.deliveryPhoto?.url) {
        setDeliveryPhoto({
          uri: order.deliveryPhoto.url,

          time: safeDate(order.deliveryPhoto.takenAt || order.deliveryTime),
        });
      } else {
        setDeliveryPhoto(null);
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("orders.loadFailed", "Unable to load active order"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadActiveOrder();
    }, [loadActiveOrder]),
  );

  /*
   * Live delivery timer.
   *
   * Backend durationSeconds remains the final
   * source of truth after delivery is completed.
   */
  useEffect(() => {
    if (!activeOrder || activeOrder.status === "delivered") {
      if (activeOrder?.durationSeconds != null) {
        setElapsedSeconds(activeOrder.durationSeconds);
      }

      return;
    }

    const updateTimer = () => {
      const pickup = new Date(activeOrder.pickupTime).getTime();

      if (Number.isNaN(pickup)) {
        return;
      }

      const seconds = Math.max(0, Math.floor((Date.now() - pickup) / 1000));

      setElapsedSeconds(seconds);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeOrder]);

  async function takePhoto(type: "pickup" | "delivery") {
    try {
      setError(null);

      const currentOrder = activeOrder;

      if (type === "pickup" && currentOrder) {
        setError(
          t(
            "orders.activeOrderExists",
            "Complete the current delivery before creating another pickup.",
          ),
        );

        return;
      }

      if (type === "delivery" && !currentOrder) {
        setError(t("orders.pickupRequired", "Take the pickup photo first."));

        return;
      }

      if (type === "delivery" && currentOrder?.status === "delivered") {
        return;
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("common.permissionRequired", "Permission Required"),
          t("orders.cameraPermission", "Camera permission is required."),
        );

        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        allowsEditing: false,

        quality: 0.75,

        cameraType: ImagePicker.CameraType.back,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];

      if (!asset?.uri) {
        setError(t("orders.photoFailed", "Unable to read captured photo."));

        return;
      }

      const photo: OrderPhotoInput = {
        uri: asset.uri,
        time: new Date(),
      };

      if (type === "pickup") {
        await uploadPickup(photo);

        return;
      }

      await uploadDelivery(photo);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("orders.photoFailed", "Unable to capture photo"),
        ),
      );
    }
  }
  async function uploadPickup(photo: OrderPhotoInput) {
    try {
      setUploadingPickup(true);

      setError(null);

      /*
       * Optimistic preview.
       */
      setPickupPhoto(photo);

      const response = await createPickupOrder({
        pickupPhoto: photo,

        notes: notes.trim() || undefined,
      });

      const order = response.order;

      setActiveOrder(order);

      /*
       * Replace local photo with uploaded URL.
       */
      if (order.pickupPhoto?.url) {
        setPickupPhoto({
          uri: order.pickupPhoto.url,

          time: safeDate(order.pickupPhoto.takenAt || order.pickupTime),
        });
      }

      setDeliveryPhoto(null);
      setElapsedSeconds(0);
    } catch (err) {
      setPickupPhoto(null);

      setError(
        getErrorMessage(
          err,
          t("orders.pickupUploadFailed", "Unable to save pickup photo"),
        ),
      );
    } finally {
      setUploadingPickup(false);
    }
  }

  async function uploadDelivery(photo: OrderPhotoInput) {
    if (!activeOrder?._id) {
      setError(t("orders.pickupRequired", "Pickup is required first."));

      return;
    }

    try {
      setUploadingDelivery(true);

      setError(null);

      setDeliveryPhoto(photo);

      const response = await completeOrderDelivery({
        orderId: activeOrder._id,

        deliveryPhoto: photo,
      });

      const updatedOrder = response.order;

      setActiveOrder(updatedOrder);

      if (updatedOrder.deliveryPhoto?.url) {
        setDeliveryPhoto({
          uri: updatedOrder.deliveryPhoto.url,

          time: safeDate(
            updatedOrder.deliveryPhoto.takenAt || updatedOrder.deliveryTime,
          ),
        });
      }

      if (updatedOrder.durationSeconds != null) {
        setElapsedSeconds(updatedOrder.durationSeconds);
      }
    } catch (err) {
      setDeliveryPhoto(null);

      setError(
        getErrorMessage(
          err,
          t("orders.deliveryUploadFailed", "Unable to complete delivery"),
        ),
      );
    } finally {
      setUploadingDelivery(false);
    }
  }

  const isDelivered = activeOrder?.status === "delivered";

  const isBusy = uploadingPickup || uploadingDelivery;

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← {t("common.back", "Back")}</Text>
        </Pressable>

        <View style={styles.heading}>
          <Text
            style={[
              styles.title,
              {
                textAlign: isArabic ? "right" : "left",
              },
            ]}
          >
            {activeOrder
              ? t("orders.delivery", "Delivery")
              : t("orders.createPickup", "New Delivery")}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                textAlign: isArabic ? "right" : "left",
              },
            ]}
          >
            {activeOrder
              ? t(
                  "orders.deliverySubtitle",
                  "Complete the delivery by taking the delivery photo.",
                )
              : t(
                  "orders.pickupSubtitle",
                  "Take a pickup photo to start the delivery.",
                )}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <>
            <View style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {isDelivered
                      ? t("orders.delivered", "Delivered")
                      : activeOrder
                        ? t("orders.inProgress", "In Progress")
                        : t("orders.newOrder", "New Order")}
                  </Text>

                  {activeOrder?._id && (
                    <Text style={styles.orderId}>
                      #{activeOrder._id.slice(-6)}
                    </Text>
                  )}
                </View>

                <View
                  style={[
                    styles.statusBadge,

                    isDelivered
                      ? styles.deliveredBadge
                      : activeOrder
                        ? styles.progressBadge
                        : styles.waitingBadge,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {isDelivered
                      ? t("orders.done", "Done")
                      : activeOrder
                        ? t("orders.active", "Active")
                        : t("orders.waiting", "Waiting")}
                  </Text>
                </View>
              </View>

              <View style={styles.durationBox}>
                <Text style={styles.durationLabel}>
                  {t("orders.totalTime", "Delivery Time")}
                </Text>

                <Text style={styles.durationValue}>
                  {activeOrder
                    ? formatDuration(
                        activeOrder.durationSeconds ?? elapsedSeconds,
                      )
                    : "00:00:00"}
                </Text>
              </View>

              {/* BOTH PHOTOS IN ONE ROW */}
              <View style={styles.photoRow}>
                <PhotoButton
                  title={t("orders.pickup", "Pickup")}
                  photo={pickupPhoto}
                  loading={uploadingPickup}
                  disabled={isBusy || !!activeOrder}
                  onPress={() => void takePhoto("pickup")}
                  placeholder="P"
                />

                <View style={styles.connection}>
                  <View style={styles.connectionLine} />

                  <Text style={styles.connectionText}>→</Text>
                </View>

                <PhotoButton
                  title={t("orders.deliveryPhoto", "Delivery")}
                  photo={deliveryPhoto}
                  loading={uploadingDelivery}
                  disabled={isBusy || !activeOrder || isDelivered}
                  onPress={() => void takePhoto("delivery")}
                  placeholder="D"
                />
              </View>

              <View style={styles.timeRow}>
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>
                    {t("orders.pickupTime", "Pickup")}
                  </Text>

                  <Text style={styles.timeValue}>
                    {activeOrder
                      ? formatDateTime(activeOrder.pickupTime, language)
                      : "--"}
                  </Text>
                </View>

                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>
                    {t("orders.deliveryTime", "Delivery")}
                  </Text>

                  <Text style={styles.timeValue}>
                    {activeOrder?.deliveryTime
                      ? formatDateTime(activeOrder.deliveryTime, language)
                      : "--"}
                  </Text>
                </View>
              </View>
            </View>

            {!activeOrder && (
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Text style={styles.sectionTitle}>
                    {t("orders.notes", "Notes")}
                  </Text>

                  <Text style={styles.optional}>
                    {t("common.optional", "Optional")}
                  </Text>
                </View>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t("orders.notesPlaceholder", "Add pickup notes")}
                  placeholderTextColor={COLORS.muted}
                  multiline
                  maxLength={500}
                  editable={!isBusy}
                  style={[
                    styles.notesInput,
                    {
                      textAlign: isArabic ? "right" : "left",
                    },
                  ]}
                />

                <Text style={styles.characterCount}>{notes.length}/500</Text>
              </View>
            )}

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {isDelivered && (
              <Pressable
                style={({ pressed }) => [
                  styles.doneButton,

                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.replace("/(driver)")}
              >
                <Text style={styles.doneButtonText}>
                  {t("common.done", "Done")}
                </Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

function PhotoButton({
  title,
  photo,
  loading,
  disabled,
  onPress,
  placeholder,
}: {
  title: string;
  photo: OrderPhotoInput | null;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  placeholder: string;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoButton,
        disabled && styles.photoButtonDisabled,
        pressed && !disabled && styles.photoButtonPressed,
      ]}
    >
      <View style={styles.photoPreview}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : photo?.uri ? (
          <Image
            source={{
              uri: photo.uri,
            }}
            style={styles.photoImage}
          />
        ) : (
          <Text style={styles.photoPlaceholder}>{placeholder}</Text>
        )}
      </View>

      <Text style={styles.photoTitle}>{title}</Text>

      <Text style={styles.photoAction}>
        {loading
          ? t("orders.photoSaving")
          : photo
            ? t("orders.photoSaved")
            : disabled
              ? t("orders.photoLocked")
              : t("orders.takePhoto")}
      </Text>
    </Pressable>
  );
}

function safeDate(value?: string | null) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(safeSeconds / 3600);

  const minutes = Math.floor((safeSeconds % 3600) / 60);

  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
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
    fontSize: 24,
    fontWeight: "900",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 4,

    fontSize: 13,
    lineHeight: 19,

    color: COLORS.muted,
  },

  loadingBox: {
    minHeight: 200,

    alignItems: "center",
    justifyContent: "center",
  },

  orderCard: {
    padding: 15,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    marginBottom: 14,
  },

  orderHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "900",

    color: COLORS.primary,
  },

  orderId: {
    marginTop: 2,

    fontSize: 10,

    color: COLORS.muted,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 999,
  },

  waitingBadge: {
    backgroundColor: COLORS.light,
  },

  progressBadge: {
    backgroundColor: "#E5F1F2",
  },

  deliveredBadge: {
    backgroundColor: COLORS.successBackground,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "800",

    color: COLORS.primary,
  },

  durationBox: {
    alignItems: "center",

    paddingVertical: 12,

    marginBottom: 14,

    borderRadius: 12,

    backgroundColor: COLORS.primary,
  },

  durationLabel: {
    fontSize: 10,
    fontWeight: "700",

    color: "#D6E6E7",
  },

  durationValue: {
    marginTop: 3,

    fontSize: 24,
    fontWeight: "900",

    letterSpacing: 1,

    color: COLORS.white,
  },

  photoRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  photoButton: {
    flex: 1,

    minHeight: 122,

    padding: 8,

    borderRadius: 13,

    borderWidth: 1,
    borderColor: COLORS.border,

    alignItems: "center",

    backgroundColor: COLORS.light,
  },

  photoButtonDisabled: {
    opacity: 0.48,
  },

  photoButtonPressed: {
    opacity: 0.75,
  },

  photoPreview: {
    width: "100%",
    height: 68,

    overflow: "hidden",

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.white,
  },

  photoImage: {
    width: "100%",
    height: "100%",
  },

  photoPlaceholder: {
    fontSize: 22,
    fontWeight: "900",

    color: COLORS.secondary,
  },

  photoTitle: {
    marginTop: 7,

    fontSize: 12,
    fontWeight: "900",

    color: COLORS.primary,
  },

  photoAction: {
    marginTop: 2,

    fontSize: 9,

    color: COLORS.muted,
  },

  connection: {
    width: 32,

    alignItems: "center",
    justifyContent: "center",
  },

  connectionLine: {
    position: "absolute",

    left: 0,
    right: 0,

    height: 1,

    backgroundColor: COLORS.border,
  },

  connectionText: {
    paddingHorizontal: 4,

    fontSize: 14,

    color: COLORS.secondary,

    backgroundColor: COLORS.white,
  },

  timeRow: {
    flexDirection: "row",

    gap: 10,

    marginTop: 13,
  },

  timeItem: {
    flex: 1,

    padding: 10,

    borderRadius: 10,

    backgroundColor: COLORS.light,
  },

  timeLabel: {
    fontSize: 9,
    fontWeight: "700",

    color: COLORS.muted,
  },

  timeValue: {
    marginTop: 3,

    fontSize: 10,
    fontWeight: "700",

    color: COLORS.black,
  },

  notesCard: {
    padding: 15,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    marginBottom: 14,
  },

  notesHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",

    color: COLORS.primary,
  },

  optional: {
    fontSize: 10,

    color: COLORS.muted,
  },

  notesInput: {
    minHeight: 90,

    padding: 11,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 11,

    backgroundColor: COLORS.light,

    color: COLORS.black,

    fontSize: 13,

    textAlignVertical: "top",
  },

  characterCount: {
    marginTop: 5,

    textAlign: "right",

    fontSize: 9,

    color: COLORS.muted,
  },

  errorBox: {
    padding: 12,

    borderRadius: 10,

    backgroundColor: COLORS.errorBackground,

    marginBottom: 12,
  },

  errorText: {
    fontSize: 12,
    lineHeight: 18,

    color: COLORS.error,
  },

  doneButton: {
    height: 47,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: COLORS.primary,
  },

  doneButtonText: {
    fontSize: 14,
    fontWeight: "800",

    color: COLORS.white,
  },

  buttonPressed: {
    backgroundColor: COLORS.secondary,
  },
});
