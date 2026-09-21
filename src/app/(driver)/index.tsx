import { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

import { useFocusEffect } from "expo-router";

import { useTranslation } from "react-i18next";

import {
  ImagePlus,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from "lucide-react-native";

import { AppScreen } from "../../components/AppScreen";

import {
  cancelOrder,
  completeOrderDelivery,
  createPickupOrder,
  getActiveOrder,
  getMyOrders,
} from "../../api/orderApi";

import { getMyShifts } from "../../api/shiftApi";
import { getMyDashboardStats } from "../../api/statsApi";

import { useAuth } from "../../hooks/useAuth";
import { useLocationTracking } from "../../hooks/useLocationTracking";
import { useShift } from "../../hooks/useShift";

import { useLanguage } from "../../context/LanguageContext";

import type {
  Order,
  OrderCancellationReason,
  OrderPhotoInput,
} from "../../types/order";
import type { DriverShift } from "../../types/shift";
import type { MyDashboardStatsResponse } from "../../types/stats";

import {
  compressOrderImage,
  compressOrderImages,
  formatDateTime,
  getErrorMessage,
} from "../../utils";

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

type DriverTabName = "home" | "orders" | "shifts" | "stats";

type DateFilter = "today" | "7days" | "30days" | "all";

type OrderStatusFilter = "all" | "delivered" | "cancelled";

export default function DriverHomeScreen() {
  const { t } = useTranslation();

  const { user } = useAuth();

  const { language } = useLanguage();

  const { isWorking, timer, startShift, endShift, isStarting, isEnding } =
    useShift(language);

  useLocationTracking({
    enabled: isWorking,
  });

  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [shifts, setShifts] = useState<DriverShift[]>([]);

  const [orderStatusFilter, setOrderStatusFilter] =
    useState<OrderStatusFilter>("all");

  const [stats, setStats] = useState<MyDashboardStatsResponse | null>(null);

  const [tab, setTab] = useState<DriverTabName>("home");

  const [cancelOrderVisible, setCancelOrderVisible] = useState(false);

  const [cancellationReason, setCancellationReason] =
    useState<OrderCancellationReason | null>(null);

  const [cancellationNotes, setCancellationNotes] = useState("");

  const [cancellationPhotos, setCancellationPhotos] = useState<
    OrderPhotoInput[]
  >([]);

  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const [isPreparingCancellationPhotos, setIsPreparingCancellationPhotos] =
    useState(false);

  const [orderFilter, setOrderFilter] = useState<DateFilter>("today");

  const [shiftFilter, setShiftFilter] = useState<DateFilter>("today");

  const [pickupPhoto, setPickupPhoto] = useState<OrderPhotoInput | null>(null);

  const [deliveryPhoto, setDeliveryPhoto] = useState<OrderPhotoInput | null>(
    null,
  );

  const [orderNotes, setOrderNotes] = useState("");

  const [notesExpanded, setNotesExpanded] = useState(false);

  const [uploadingPickup, setUploadingPickup] = useState(false);

  const [uploadingDelivery, setUploadingDelivery] = useState(false);

  const [orderElapsedSeconds, setOrderElapsedSeconds] = useState(0);
  const [finishShiftVisible, setFinishShiftVisible] = useState(false);

  const [isLoadingOrder, setIsLoadingOrder] = useState(true);

  const [orderError, setOrderError] = useState<string | null>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setOrderError(null);
      setIsLoadingOrder(true);

      const [activeResponse, ordersResponse] = await Promise.all([
        getActiveOrder(),
        getMyOrders(),
      ]);

      const active = activeResponse.order;

      const orderList = ordersResponse.orders ?? [];

      setActiveOrder(active);

      setOrders(orderList);

      if (active) {
        setOrderNotes(active.notes ?? "");

        if (active.pickupPhoto?.url) {
          setPickupPhoto({
            uri: active.pickupPhoto.url,

            time: safeDate(active.pickupPhoto.takenAt || active.pickupTime),
          });
        }

        if (active.deliveryPhoto?.url) {
          setDeliveryPhoto({
            uri: active.deliveryPhoto.url,

            time: safeDate(active.deliveryPhoto.takenAt || active.deliveryTime),
          });
        } else {
          setDeliveryPhoto(null);
        }
      } else {
        setPickupPhoto(null);

        setDeliveryPhoto(null);

        setOrderNotes("");

        setOrderElapsedSeconds(0);

        setNotesExpanded(false);
      }
    } catch (error) {
      setOrderError(
        getErrorMessage(
          error,
          t("driver.activeOrderFailed", "Unable to load orders"),
        ),
      );
    } finally {
      setIsLoadingOrder(false);
    }
  }, [t]);

  const loadShifts = useCallback(async () => {
    try {
      const response = await getMyShifts();

      setShifts(response.shifts ?? []);
    } catch (error) {
      setOrderError(
        getErrorMessage(error, t("shifts.loadFailed", "Unable to load shifts")),
      );
    }
  }, [t]);

  const loadStats = useCallback(async () => {
    try {
      const response = await getMyDashboardStats();

      setStats(response);
    } catch (error) {
      setOrderError(
        getErrorMessage(
          error,
          t("stats.loadFailed", "Unable to load statistics"),
        ),
      );
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  useEffect(() => {
    if (tab === "shifts") {
      void loadShifts();
    }

    if (tab === "stats") {
      void loadStats();
    }
  }, [tab, loadShifts, loadStats]);

  /*
   * Live order timer.
   */
useEffect(() => {
  const pickupStart =
    activeOrder?.pickupTime
      ? new Date(
          activeOrder.pickupTime,
        ).getTime()
      : uploadingPickup &&
          pickupPhoto?.time
        ? pickupPhoto.time.getTime()
        : null;

  if (!pickupStart) {
    setOrderElapsedSeconds(0);

    return;
  }

  const updateTimer = () => {
    const elapsed =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            pickupStart
          ) / 1000,
        ),
      );

    setOrderElapsedSeconds(
      elapsed,
    );
  };

  updateTimer();

  const interval =
    setInterval(
      updateTimer,
      1000,
    );

  return () => {
    clearInterval(
      interval,
    );
  };
}, [
  activeOrder,
  uploadingPickup,
  pickupPhoto?.time,
]);

  const handleStartShift = async () => {
    try {
      await startShift();
    } catch {
      // handled by hook
    }
  };

  const pickCancellationPhotos = async () => {
    try {
      setOrderError(null);

      const remaining = 5 - cancellationPhotos.length;

      if (remaining <= 0) {
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("common.permissionRequired", "Permission Required"),
          t(
            "orders.galleryPermission",
            "Photo library permission is required.",
          ),
        );

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,

        allowsMultipleSelection: true,

        selectionLimit: remaining,

        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const assets =
        result.assets?.filter((asset) => !!asset.uri).slice(0, remaining) ?? [];

      if (assets.length === 0) {
        return;
      }

      setIsPreparingCancellationPhotos(true);

      const captureTime = new Date();

      const compressedUris = await compressOrderImages(
        assets.map((asset) => asset.uri),
        "cancellation",
      );

      const newPhotos: OrderPhotoInput[] = compressedUris.map((uri) => ({
        uri,
        time: captureTime,
      }));

      setCancellationPhotos((current) =>
        [...current, ...newPhotos].slice(0, 5),
      );
    } catch (error) {
      setOrderError(
        getErrorMessage(
          error,
          t(
            "orders.cancelPhotoFailed",
            "Unable to prepare cancellation photos",
          ),
        ),
      );
    } finally {
      setIsPreparingCancellationPhotos(false);
    }
  };

  const handleEndShift = () => {
    if (isEnding) {
      return;
    }

    setFinishShiftVisible(true);
  };

  const confirmEndShift = async () => {
    try {
      setFinishShiftVisible(false);

      await endShift();
    } catch {
      // handled by hook
    }
  };

const takeOrderPhoto = async (
  type: "pickup" | "delivery",
) => {
  try {
    setOrderError(null);

    if (
      type === "pickup" &&
      (activeOrder || uploadingPickup)
    ) {
      return;
    }

    if (
      type === "pickup" &&
      !isWorking
    ) {
      setOrderError(
        t(
          "driver.startShiftFirst",
          "Start your shift first",
        ),
      );

      return;
    }

    if (
      type === "delivery" &&
      (!activeOrder || uploadingDelivery)
    ) {
      return;
    }

    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t(
          "common.permissionRequired",
          "Permission Required",
        ),
        t(
          "orders.cameraPermission",
          "Camera permission is required.",
        ),
      );

      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes:
          ImagePicker.MediaTypeOptions.Images,

        allowsEditing: false,

        /*
         * Camera does an initial lightweight
         * reduction. Our image utility performs
         * the final compression.
         */
        quality: 0.8,

        cameraType:
          ImagePicker.CameraType.back,
      });

    if (result.canceled) {
      return;
    }

    const asset =
      result.assets?.[0];

    if (!asset?.uri) {
      setOrderError(
        t(
          "orders.photoFailed",
          "Unable to read captured photo.",
        ),
      );

      return;
    }

    const capturedPhoto: OrderPhotoInput = {
      uri: asset.uri,
      time: new Date(),
    };

    /*
     * OPTIMISTIC UI
     *
     * Show the original local image immediately.
     * Do not make the user wait for compression
     * or network upload.
     */
    if (type === "pickup") {
      setPickupPhoto(
        capturedPhoto,
      );

      setUploadingPickup(true);

      void processPickupInBackground(
        capturedPhoto,
      );

      return;
    }

    setDeliveryPhoto(
      capturedPhoto,
    );

    setUploadingDelivery(true);

    void processDeliveryInBackground(
      capturedPhoto,
    );
  } catch (error) {
    setOrderError(
      getErrorMessage(
        error,
        t(
          "orders.photoFailed",
          "Unable to capture photo",
        ),
      ),
    );
  }
};

 const processPickupInBackground =
  async (
    capturedPhoto: OrderPhotoInput,
  ) => {
    try {
      setOrderError(null);

      /*
       * STEP 1:
       * Compress local camera image.
       */
      const compressedUri =
        await compressOrderImage(
          capturedPhoto.uri,
          "pickup",
        );

      const compressedPhoto: OrderPhotoInput = {
        uri: compressedUri,

        /*
         * Keep the original capture time.
         * Compression time must NOT become
         * pickup time.
         */
        time:
          capturedPhoto.time,
      };

      /*
       * Replace preview with compressed file.
       * UI remains visible throughout.
       */
      setPickupPhoto(
        compressedPhoto,
      );

      /*
       * STEP 2:
       * Upload compressed image.
       */
      const response =
        await createPickupOrder({
          pickupPhoto:
            compressedPhoto,

          notes:
            orderNotes.trim() ||
            undefined,
        });

      const createdOrder =
        response.order;

      setActiveOrder(
        createdOrder,
      );

      setOrders((current) => [
        createdOrder,

        ...current.filter(
          (order) =>
            order._id !==
            createdOrder._id,
        ),
      ]);

      setOrderNotes(
        createdOrder.notes ??
          orderNotes,
      );

      /*
       * Replace local compressed URI
       * with permanent server image URL.
       */
      if (
        createdOrder.pickupPhoto
          ?.url
      ) {
        setPickupPhoto({
          uri:
            createdOrder
              .pickupPhoto.url,

          time: safeDate(
            createdOrder
              .pickupPhoto
              .takenAt ||
              createdOrder
                .pickupTime,
          ),
        });
      }

      setDeliveryPhoto(
        null,
      );

      setOrderElapsedSeconds(
        0,
      );
    } catch (error) {
      /*
       * Optimistic operation failed,
       * so rollback pickup UI.
       */
      setPickupPhoto(null);

      setOrderError(
        getErrorMessage(
          error,
          t(
            "orders.pickupUploadFailed",
            "Unable to save pickup photo",
          ),
        ),
      );
    } finally {
      setUploadingPickup(
        false,
      );
    }
  };;

const processDeliveryInBackground =
  async (
    capturedPhoto: OrderPhotoInput,
  ) => {
    const currentOrder =
      activeOrder;

    if (!currentOrder?._id) {
      setUploadingDelivery(
        false,
      );

      return;
    }

    try {
      setOrderError(null);

      /*
       * STEP 1:
       * Compress in background.
       */
      const compressedUri =
        await compressOrderImage(
          capturedPhoto.uri,
          "delivery",
        );

      const compressedPhoto: OrderPhotoInput = {
        uri: compressedUri,

        time:
          capturedPhoto.time,
      };

      setDeliveryPhoto(
        compressedPhoto,
      );

      /*
       * STEP 2:
       * Upload compressed file.
       */
      const response =
        await completeOrderDelivery({
          orderId:
            currentOrder._id,

          deliveryPhoto:
            compressedPhoto,
        });

      const completedOrder =
        response.order;

      setOrders((current) => [
        completedOrder,

        ...current.filter(
          (order) =>
            order._id !==
            completedOrder._id,
        ),
      ]);

      setOrderElapsedSeconds(
        completedOrder
          .durationSeconds ??
          0,
      );

      /*
       * Only clear active order after
       * backend confirms delivery.
       *
       * This prevents a new pickup being
       * created while delivery is still
       * uploading.
       */
      setActiveOrder(null);

      setPickupPhoto(null);

      setDeliveryPhoto(null);

      setOrderNotes("");

      setNotesExpanded(false);
    } catch (error) {
      /*
       * Roll back delivery photo because
       * backend never completed the order.
       */
      setDeliveryPhoto(null);

      setOrderError(
        getErrorMessage(
          error,
          t(
            "orders.deliveryUploadFailed",
            "Unable to complete delivery",
          ),
        ),
      );
    } finally {
      setUploadingDelivery(
        false,
      );
    }
  };

  const isArabic = language === "ar";

  const removeCancellationPhoto = (index: number) => {
    setCancellationPhotos((current) =>
      current.filter((_, photoIndex) => photoIndex !== index),
    );
  };

  const openCancelOrder = () => {
    if (!activeOrder) {
      return;
    }

    setCancellationReason(null);

    setCancellationNotes("");

    setCancellationPhotos([]);

    setCancelOrderVisible(true);
  };

  const closeCancelOrder = () => {
    if (isCancellingOrder) {
      return;
    }

    setCancelOrderVisible(false);
  };

  const handleCancelOrder = async () => {
    if (!activeOrder?._id) {
      return;
    }

    if (!cancellationReason) {
      setOrderError(
        t("orders.cancelReasonRequired", "Select a cancellation reason"),
      );

      return;
    }

    if (cancellationReason === "other" && !cancellationNotes.trim()) {
      setOrderError(
        t(
          "orders.cancelNotesRequired",
          "Please explain the cancellation reason",
        ),
      );

      return;
    }

    if (cancellationPhotos.length === 0) {
      setOrderError(
        t("orders.cancelPhotoRequired", "Add at least one cancellation photo"),
      );

      return;
    }

    try {
      setIsCancellingOrder(true);

      setOrderError(null);

      const response = await cancelOrder({
        orderId: activeOrder._id,

        cancellationReason,

        cancellationNotes: cancellationNotes.trim() || undefined,

        cancellationPhotos,

        cancelledAt: new Date(),
      });

      const cancelledOrder = response.order;

      setOrders((current) => [
        cancelledOrder,

        ...current.filter((order) => order._id !== cancelledOrder._id),
      ]);

      setActiveOrder(null);

      setPickupPhoto(null);

      setDeliveryPhoto(null);

      setOrderNotes("");

      setOrderElapsedSeconds(0);

      setNotesExpanded(false);

      setCancellationReason(null);

      setCancellationNotes("");

      setCancellationPhotos([]);

      setCancelOrderVisible(false);
    } catch (error) {
      setOrderError(
        getErrorMessage(
          error,
          t("orders.cancelFailed", "Unable to cancel order"),
        ),
      );
    } finally {
      setIsCancellingOrder(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.root}>
        <View style={styles.fixedHeader}>
          <Text
            style={[
              styles.greeting,

              {
                textAlign: isArabic ? "right" : "left",
              },
            ]}
          >
            {t("driver.welcome", "Welcome")}

            {user?.name ? `, ${user.name}` : ""}
          </Text>

          <DriverTabs activeTab={tab} onChange={setTab} />
        </View>

        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "home" && (
            <View style={styles.homeContent}>
              <RecentOrders
                orders={orders}
                activeOrder={activeOrder}
                language={language}
                expandedOrderId={expandedOrderId}
                setExpandedOrderId={setExpandedOrderId}
              />

              <InlineOrderCreator
                activeOrder={activeOrder}
                pickupPhoto={pickupPhoto}
                deliveryPhoto={deliveryPhoto}
                elapsedSeconds={orderElapsedSeconds}
                notes={orderNotes}
                setNotes={setOrderNotes}
                notesExpanded={notesExpanded}
                setNotesExpanded={setNotesExpanded}
                uploadingPickup={uploadingPickup}
                uploadingDelivery={uploadingDelivery}
                isWorking={isWorking}
                error={orderError}
                onPickup={() => void takeOrderPhoto("pickup")}
                onDelivery={() => void takeOrderPhoto("delivery")}
                onCancelOrder={openCancelOrder}
              />

              <ShiftControl
                isWorking={isWorking}
                timer={timer}
                isStarting={isStarting}
                isEnding={isEnding}
                onStart={handleStartShift}
                onEnd={handleEndShift}
              />
            </View>
          )}

          {tab === "orders" && (
            <OrdersPanel
              orders={orders}
              activeOrder={activeOrder}
              language={language}
              expandedOrderId={expandedOrderId}
              setExpandedOrderId={setExpandedOrderId}
              isLoading={isLoadingOrder}
              filter={orderFilter}
              setFilter={setOrderFilter}
              statusFilter={orderStatusFilter}
              setStatusFilter={setOrderStatusFilter}
            />
          )}

          {tab === "shifts" && (
            <ShiftsPanel
              shifts={shifts}
              language={language}
              filter={shiftFilter}
              setFilter={setShiftFilter}
            />
          )}

          {tab === "stats" && <StatsPanel stats={stats} />}
        </ScrollView>
      </View>
      <FinishShiftModal
        visible={finishShiftVisible}
        timer={timer}
        isEnding={isEnding}
        onContinue={() => setFinishShiftVisible(false)}
        onFinish={() => void confirmEndShift()}
      />

      <CancelOrderModal
        visible={cancelOrderVisible}
        reason={cancellationReason}
        notes={cancellationNotes}
        photos={cancellationPhotos}
        isCancelling={isCancellingOrder}
        isPreparingPhotos={isPreparingCancellationPhotos}
        onReasonChange={setCancellationReason}
        onNotesChange={setCancellationNotes}
        onAddPhotos={() => void pickCancellationPhotos()}
        onRemovePhoto={removeCancellationPhoto}
        onClose={closeCancelOrder}
        onConfirm={() => void handleCancelOrder()}
      />
    </AppScreen>
  );
}

function filterByDate<T>(
  items: T[],

  getDate: (item: T) => string | Date | null | undefined,

  filter: DateFilter,
) {
  if (filter === "all") {
    return items;
  }

  const now = new Date();

  const start = new Date(now);

  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
  }

  if (filter === "7days") {
    start.setDate(now.getDate() - 6);

    start.setHours(0, 0, 0, 0);
  }

  if (filter === "30days") {
    start.setDate(now.getDate() - 29);

    start.setHours(0, 0, 0, 0);
  }

  return items.filter((item) => {
    const rawDate = getDate(item);

    if (!rawDate) {
      return false;
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date >= start && date <= now;
  });
}

function DateFilterBar({
  value,
  onChange,
}: {
  value: DateFilter;

  onChange: (value: DateFilter) => void;
}) {
  const { t } = useTranslation();

  const options: {
    key: DateFilter;
    label: string;
  }[] = [
    {
      key: "today",
      label: t("filters.today", "Today"),
    },

    {
      key: "7days",
      label: t("filters.sevenDays", "7 Days"),
    },

    {
      key: "30days",
      label: t("filters.thirtyDays", "30 Days"),
    },

    {
      key: "all",
      label: t("filters.all", "All"),
    },
  ];

  return (
    <View style={styles.dateFilters}>
      {options.map((option) => {
        const active = value === option.key;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.dateFilterButton,

              active && styles.dateFilterButtonActive,

              pressed && styles.dateFilterButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.dateFilterText,

                active && styles.dateFilterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function InlineOrderCreator({
  activeOrder,
  pickupPhoto,
  deliveryPhoto,
  elapsedSeconds,
  notes,
  setNotes,
  notesExpanded,
  setNotesExpanded,
  uploadingPickup,
  uploadingDelivery,
  isWorking,
  error,
  onPickup,
  onDelivery,
  onCancelOrder,
}: {
  activeOrder: Order | null;
  onCancelOrder: () => void;

  pickupPhoto: OrderPhotoInput | null;

  deliveryPhoto: OrderPhotoInput | null;

  elapsedSeconds: number;

  notes: string;

  setNotes: (value: string) => void;

  notesExpanded: boolean;

  setNotesExpanded: (value: boolean) => void;

  uploadingPickup: boolean;

  uploadingDelivery: boolean;

  isWorking: boolean;

  error: string | null;

  onPickup: () => void;

  onDelivery: () => void;
}) {
  const { t } = useTranslation();

  const isBusy = uploadingPickup || uploadingDelivery;

  return (
    <View style={styles.inlineOrderCard}>
      <View style={styles.inlineOrderHeader}>
        <View
          style={{
            flex: 1,
          }}
        >
          <Text style={styles.inlineOrderTitle}>
            {activeOrder
              ? `${t(
                  "driver.activeDelivery",
                  "Active Delivery",
                )}${activeOrder.orderId ? ` #${activeOrder.orderId}` : ""}`
              : t("driver.newOrder", "New Order")}
          </Text>

          <Text style={styles.inlineOrderTimer}>
            {formatDuration(elapsedSeconds)}
          </Text>
        </View>

        <View style={styles.orderHeaderActions}>
          <Pressable
            onPress={() => setNotesExpanded(!notesExpanded)}
            style={({ pressed }) => [
              styles.noteButton,

              pressed && styles.buttonPressed,
            ]}
          >
            <Pencil size={15} color={COLORS.primary} />
          </Pressable>

          {activeOrder && (
            <Pressable
              onPress={onCancelOrder}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.orderMenuButton,

                pressed && !isBusy && styles.buttonPressed,

                isBusy && styles.compactPhotoDisabled,
              ]}
            >
              <MoreVertical size={17} color={COLORS.primary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.inlinePhotoRow}>
        <CompactPhotoButton
          title={t("orders.pickup", "Pickup")}
          photo={pickupPhoto}
          loading={uploadingPickup}
          disabled={!isWorking || !!activeOrder || isBusy}
          onPress={onPickup}
        />

        <View style={styles.photoConnector}>
          <View style={styles.photoConnectorLine} />

          <Text style={styles.photoConnectorText}>→</Text>
        </View>

        <CompactPhotoButton
          title={t("orders.deliveryPhoto", "Delivery")}
          photo={deliveryPhoto}
          loading={uploadingDelivery}
          disabled={!activeOrder || isBusy}
          onPress={onDelivery}
        />
      </View>

      {notesExpanded && (
        <View style={styles.notesEditor}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            editable={!activeOrder}
            placeholder={t("orders.notesPlaceholder", "Add notes")}
            placeholderTextColor={COLORS.muted}
            multiline
            maxLength={500}
            style={[styles.notesInput, activeOrder && styles.notesInputLocked]}
          />

          <View style={styles.notesFooter}>
            {activeOrder ? (
              <Text style={styles.notesLockedText}>
                {t("orders.notesSaved", "Saved with pickup")}
              </Text>
            ) : (
              <Text style={styles.notesHint}>
                {t(
                  "orders.notesBeforePickup",
                  "This note will be saved with the pickup.",
                )}
              </Text>
            )}

            <Text style={styles.characterCount}>
              {notes.length}
              /500
            </Text>
          </View>
        </View>
      )}

      {!!error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!isWorking && !activeOrder && (
        <Text style={styles.startShiftHint}>
          {t("driver.startShiftFirst", "Start your shift to create an order")}
        </Text>
      )}
    </View>
  );
}

function CompactPhotoButton({
  title,
  photo,
  loading,
  disabled,
  onPress,
}: {
  title: string;

  photo: OrderPhotoInput | null;

  loading: boolean;

  disabled: boolean;

  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.compactPhotoButton,

        disabled && styles.compactPhotoDisabled,

        pressed && !disabled && styles.compactPhotoPressed,
      ]}
    >
    <View style={styles.compactPhotoPreview}>
  {photo?.uri ? (
    <>
      <Image
        source={{
          uri: photo.uri,
        }}
        style={
          styles.compactPhotoImage
        }
      />

      {loading && (
        <View
          style={
            styles.photoUploadingOverlay
          }
        >
          <ActivityIndicator
            size="small"
            color={
              COLORS.white
            }
          />
        </View>
      )}
    </>
  ) : loading ? (
    <ActivityIndicator
      size="small"
      color={COLORS.primary}
    />
  ) : (
    <Text
      style={
        styles.compactPhotoPlus
      }
    >
      +
    </Text>
  )}
</View>

      <View style={styles.compactPhotoText}>
        <Text style={styles.compactPhotoTitle}>{title}</Text>

        <Text style={styles.compactPhotoStatus}>
          {loading
            ? t("orders.photoSaving", "Saving...")
            : photo
              ? t("orders.photoSaved", "Saved")
              : disabled
                ? t("orders.photoLocked", "Locked")
                : t("orders.takePhoto", "Take photo")}
        </Text>
      </View>
    </Pressable>
  );
}

function ShiftControl({
  isWorking,
  timer,
  isStarting,
  isEnding,
  onStart,
  onEnd,
}: {
  isWorking: boolean;

  timer: string;

  isStarting: boolean;

  isEnding: boolean;

  onStart: () => void;

  onEnd: () => void;
}) {
  const { t } = useTranslation();

  const loading = isWorking ? isEnding : isStarting;

  return (
    <Pressable
      onPress={isWorking ? onEnd : onStart}
      disabled={loading}
      style={({ pressed }) => [
        styles.shiftButton,

        isWorking && styles.shiftButtonWorking,

        pressed && styles.shiftButtonPressed,

        loading && styles.disabledButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.white} />
      ) : (
        <>
          <View style={[styles.shiftDot, isWorking && styles.shiftDotActive]} />

          <View style={styles.shiftButtonContent}>
            <Text style={styles.shiftButtonTitle}>
              {isWorking
                ? t("driver.endShift", "End Shift")
                : t("driver.startShift", "Start Shift")}
            </Text>

            {isWorking && <Text style={styles.shiftButtonTimer}>{timer}</Text>}
          </View>
        </>
      )}
    </Pressable>
  );
}

function FinishShiftModal({
  visible,
  timer,
  isEnding,
  onContinue,
  onFinish,
}: {
  visible: boolean;
  timer: string;
  isEnding: boolean;
  onContinue: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <Pressable style={styles.finishShiftOverlay} onPress={onContinue}>
        <Pressable style={styles.finishShiftModal} onPress={() => {}}>
          <View style={styles.finishShiftIcon}>
            <Text style={styles.finishShiftIconText}>✓</Text>
          </View>

          <Text style={styles.finishShiftTitle}>
            {t("shifts.finishTitle", "Finish your shift?")}
          </Text>

          <Text style={styles.finishShiftDescription}>
            {t(
              "shifts.finishDescription",
              "You've done enough for today. Finish your shift and get some rest?",
            )}
          </Text>

          <View style={styles.finishShiftTime}>
            <Text style={styles.finishShiftTimeLabel}>
              {t("shifts.timeWorked", "Time worked")}
            </Text>

            <Text style={styles.finishShiftTimeValue}>{timer}</Text>
          </View>

          <Pressable
            onPress={onFinish}
            disabled={isEnding}
            style={({ pressed }) => [
              styles.finishShiftButton,
              pressed && styles.finishShiftButtonPressed,
              isEnding && styles.disabledButton,
            ]}
          >
            {isEnding ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.finishShiftButtonText}>
                {t("shifts.getSomeRest", "Get Some Rest")}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onContinue}
            disabled={isEnding}
            style={({ pressed }) => [
              styles.continueShiftButton,
              pressed && styles.continueShiftButtonPressed,
            ]}
          >
            <Text style={styles.continueShiftText}>
              {t("shifts.continueWorking", "Continue Working")}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CancelOrderModal({
  visible,
  reason,
  notes,
  photos,
  isCancelling,
  isPreparingPhotos,
  onReasonChange,
  onNotesChange,
  onAddPhotos,
  onRemovePhoto,
  onClose,
  onConfirm,
}: {
  visible: boolean;

  reason: OrderCancellationReason | null;

  notes: string;

  photos: OrderPhotoInput[];

  isCancelling: boolean;

  isPreparingPhotos: boolean;

  onReasonChange: (reason: OrderCancellationReason) => void;

  onNotesChange: (value: string) => void;

  onAddPhotos: () => void;

  onRemovePhoto: (index: number) => void;

  onClose: () => void;

  onConfirm: () => void;
}) {
  const { t } = useTranslation();

  const reasons: {
    value: OrderCancellationReason;
    label: string;
  }[] = [
    {
      value: "customer_unavailable",
      label: t("orders.cancelCustomerUnavailable", "Customer unavailable"),
    },
    {
      value: "wrong_address",
      label: t("orders.cancelWrongAddress", "Wrong address"),
    },
    {
      value: "vehicle_issue",
      label: t("orders.cancelVehicleIssue", "Vehicle issue"),
    },
    {
      value: "order_issue",
      label: t("orders.cancelOrderIssue", "Order issue"),
    },
    {
      value: "emergency",
      label: t("orders.cancelEmergency", "Emergency"),
    },
    {
      value: "other",
      label: t("orders.cancelOther", "Other"),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.cancelOverlay}>
        <View style={styles.cancelModal}>
          <View style={styles.cancelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelTitle}>
                {t("orders.cancelOrder", "Cancel Order")}
              </Text>

              <Text style={styles.cancelSubtitle}>
                {t(
                  "orders.cancelDescription",
                  "Select a reason and add photo evidence.",
                )}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={isCancelling}
              style={styles.cancelClose}
            >
              <X size={17} color={COLORS.primary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.cancelSectionLabel}>
              {t("orders.cancelReason", "Reason")}
            </Text>

            <View style={styles.reasonList}>
              {reasons.map((item) => {
                const selected = reason === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => onReasonChange(item.value)}
                    style={[
                      styles.reasonChip,

                      selected && styles.reasonChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,

                        selected && styles.reasonChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.cancelSectionLabel}>
              {t("orders.cancelNotes", "Details")}
            </Text>

            <TextInput
              value={notes}
              onChangeText={onNotesChange}
              placeholder={t(
                "orders.cancelNotesPlaceholder",
                "Explain what happened",
              )}
              placeholderTextColor={COLORS.muted}
              multiline
              maxLength={1000}
              style={styles.cancelNotesInput}
            />

            <View style={styles.cancelPhotoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelSectionLabel}>
                  {t("orders.cancelPhotos", "Photo Evidence")}
                </Text>

                <Text style={styles.cancelPhotoHint}>
                  {t(
                    "orders.cancelPhotoRequiredHint",
                    "At least one image is required",
                  )}
                </Text>
              </View>

              <Text style={styles.cancelPhotoCount}>{photos.length}/5</Text>
            </View>

            <View style={styles.cancelPhotos}>
              {photos.map((photo, index) => (
                <View
                  key={`${photo.uri}-${index}`}
                  style={styles.cancelPhotoItem}
                >
                  <Image
                    source={{
                      uri: photo.uri,
                    }}
                    style={styles.cancelPhotoImage}
                  />

                  <Pressable
                    onPress={() => onRemovePhoto(index)}
                    style={styles.removeCancelPhoto}
                  >
                    <Trash2 size={12} color={COLORS.white} />
                  </Pressable>
                </View>
              ))}

              {photos.length < 5 && (
                <Pressable
                  onPress={onAddPhotos}
                  disabled={isPreparingPhotos}
                  style={styles.addCancelPhoto}
                >
                  {isPreparingPhotos ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <>
                      <ImagePlus size={19} color={COLORS.primary} />

                      <Text style={styles.addCancelPhotoText}>
                        {t("orders.addPhotos", "Add")}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </ScrollView>

          <Pressable
            onPress={onConfirm}
            disabled={isCancelling || isPreparingPhotos}
            style={({ pressed }) => [
              styles.confirmCancelButton,

              pressed && styles.confirmCancelPressed,

              (isCancelling || isPreparingPhotos) && styles.disabledButton,
            ]}
          >
            {isCancelling ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.confirmCancelText}>
                {t("orders.confirmCancel", "Cancel Order")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RecentOrders({
  orders,
  activeOrder,
  language,
  expandedOrderId,
  setExpandedOrderId,
}: {
  orders: Order[];

  activeOrder: Order | null;

  language: "ar" | "en";

  expandedOrderId: string | null;

  setExpandedOrderId: (value: string | null) => void;
}) {
  const { t } = useTranslation();

  const completedOrders = orders
    .filter(
      (order) => order.status === "delivered" && order._id !== activeOrder?._id,
    )
    .slice(0, 5);

  if (completedOrders.length === 0) {
    return null;
  }

  return (
    <View style={styles.recentSection}>
      <Text style={styles.sectionTitle}>
        {t("driver.recentDeliveries", "Recent Deliveries")}
      </Text>

      {completedOrders.map((order) => (
        <CompletedOrderRow
          key={order._id}
          order={order}
          language={language}
          expanded={expandedOrderId === order._id}
          onToggle={() =>
            setExpandedOrderId(expandedOrderId === order._id ? null : order._id)
          }
        />
      ))}
    </View>
  );
}

function OrderStatusFilterBar({
  value,
  onChange,
}: {
  value: OrderStatusFilter;

  onChange: (value: OrderStatusFilter) => void;
}) {
  const { t } = useTranslation();

  const options: {
    key: OrderStatusFilter;
    label: string;
  }[] = [
    {
      key: "all",
      label: t("filters.all", "All"),
    },

    {
      key: "delivered",
      label: t("orders.delivered", "Delivered"),
    },

    {
      key: "cancelled",
      label: t("orders.cancelled", "Cancelled"),
    },
  ];

  return (
    <View style={styles.orderStatusFilters}>
      {options.map((option) => {
        const active = value === option.key;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.orderStatusFilterButton,

              active && styles.orderStatusFilterButtonActive,

              option.key === "cancelled" &&
                active &&
                styles.orderStatusFilterCancelledActive,

              pressed && styles.dateFilterButtonPressed,
            ]}
          >
            <Text
              style={[
                styles.orderStatusFilterText,

                active && styles.orderStatusFilterTextActive,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function OrdersPanel({
  orders,
  activeOrder,
  language,
  expandedOrderId,
  setExpandedOrderId,
  isLoading,
  filter,
  setFilter,
  statusFilter,
  setStatusFilter,
}: {
  orders: Order[];

  activeOrder: Order | null;

  language: "ar" | "en";

  expandedOrderId: string | null;

  setExpandedOrderId: (value: string | null) => void;

  isLoading: boolean;

  filter: DateFilter;

  setFilter: (value: DateFilter) => void;

  statusFilter: OrderStatusFilter;

  setStatusFilter: (value: OrderStatusFilter) => void;
}) {
  const { t } = useTranslation();

  const dateFilteredOrders = filterByDate(
    orders,

    (order) => order.pickupTime || order.createdAt,

    filter,
  );

  const filteredOrders = dateFilteredOrders.filter((order) => {
    if (statusFilter === "all") {
      return true;
    }

    return order.status === statusFilter;
  });

  if (isLoading) {
    return (
      <View style={styles.panelLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{t("driver.orders", "Orders")}</Text>

        <Text style={styles.resultCount}>{filteredOrders.length}</Text>
      </View>

      <DateFilterBar value={filter} onChange={setFilter} />
      <OrderStatusFilterBar value={statusFilter} onChange={setStatusFilter} />

      {filteredOrders.length === 0 ? (
        <Text style={styles.emptyText}>
          {t("driver.noOrdersForPeriod", "No orders found for this period")}
        </Text>
      ) : (
        filteredOrders.map((order) => {
          const active = activeOrder?._id === order._id;

          if (active) {
            return (
              <ActiveOrderHistoryRow
                key={order._id}
                order={order}
                language={language}
              />
            );
          }

          return (
            <CompletedOrderRow
              key={order._id}
              order={order}
              language={language}
              expanded={expandedOrderId === order._id}
              onToggle={() =>
                setExpandedOrderId(
                  expandedOrderId === order._id ? null : order._id,
                )
              }
            />
          );
        })
      )}
    </View>
  );
}

function ActiveOrderHistoryRow({
  order,
  language,
}: {
  order: Order;

  language: "ar" | "en";
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.historyOrderRow}>
      <View style={styles.historyPhotos}>
        <Image
          source={{
            uri: order.pickupPhoto.url,
          }}
          style={styles.historyPhoto}
        />

        <Text style={styles.historyArrow}>→</Text>

        <View style={[styles.historyPhoto, styles.emptyHistoryPhoto]}>
          <Text style={styles.emptyHistoryPhotoText}>D</Text>
        </View>
      </View>

      <View style={styles.historyInfo}>
        <Text style={styles.historyOrderTitle}>
          {`${t(
            "driver.activeDelivery",
            "Active Delivery",
          )}${order.orderId ? ` #${order.orderId}` : ""}`}
        </Text>

        <Text style={styles.historyOrderMeta}>
          {formatDateTime(order.pickupTime, language)}
        </Text>
      </View>

      <View style={styles.activeBadge}>
        <Text style={styles.activeBadgeText}>
          {t("driver.active", "Active")}
        </Text>
      </View>
    </View>
  );
}

function CompletedOrderRow({
  order,
  language,
  expanded,
  onToggle,
}: {
  order: Order;

  language: "ar" | "en";

  expanded: boolean;

  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const isCancelled = order.status === "cancelled";

  return (
    <View style={styles.completedOrderCard}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [
          styles.historyOrderRow,

          pressed && styles.rowPressed,
        ]}
      >
        <View style={styles.historyPhotos}>
          <Image
            source={{
              uri: order.pickupPhoto.url,
            }}
            style={styles.historyPhoto}
          />

          <Text style={styles.historyArrow}>→</Text>

          {order.deliveryPhoto?.url ? (
            <Image
              source={{
                uri: order.deliveryPhoto.url,
              }}
              style={styles.historyPhoto}
            />
          ) : (
            <View style={[styles.historyPhoto, styles.emptyHistoryPhoto]}>
              <Text style={styles.emptyHistoryPhotoText}>D</Text>
            </View>
          )}
        </View>

        <View style={styles.historyInfo}>
          <Text style={styles.historyOrderTitle}>
            {isCancelled
              ? `${t(
                  "orders.cancelledOrder",
                  "Cancelled Order",
                )}${order.orderId ? ` #${order.orderId}` : ""}`
              : `${t(
                  "driver.delivery",
                  "Delivery",
                )}${order.orderId ? ` #${order.orderId}` : ""}`}
          </Text>

          <Text style={styles.historyOrderMeta}>
            {order.durationSeconds != null
              ? formatDuration(order.durationSeconds)
              : "--"}
          </Text>
        </View>

        <View style={[isCancelled ? styles.cancelledBadge : styles.doneBadge]}>
          <Text
            style={[
              isCancelled ? styles.cancelledBadgeText : styles.doneBadgeText,
            ]}
          >
            {isCancelled
              ? t("orders.cancelled", "Cancelled")
              : t("orders.delivered", "Delivered")}
          </Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.completedExpanded}>
          <View style={styles.expandedLine}>
            <Text style={styles.expandedLabel}>
              {t("orders.pickupTime", "Pickup")}
            </Text>

            <Text style={styles.expandedValue}>
              {formatDateTime(order.pickupTime, language)}
            </Text>
          </View>

          {!!order.orderId && (
            <View style={styles.expandedLine}>
              <Text style={styles.expandedLabel}>
                {t("orders.orderId", "Order ID")}
              </Text>

              <Text style={styles.expandedValue}>#{order.orderId}</Text>
            </View>
          )}

          <View style={styles.expandedLine}>
            <Text style={styles.expandedLabel}>
              {t("orders.deliveryTime", "Delivery")}
            </Text>

            <Text style={styles.expandedValue}>
              {order.deliveryTime
                ? formatDateTime(order.deliveryTime, language)
                : "--"}
            </Text>
          </View>

          {!!order.notes && (
            <Text style={styles.expandedNotes}>{order.notes}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function ShiftsPanel({
  shifts,
  language,
  filter,
  setFilter,
}: {
  shifts: DriverShift[];

  language: "ar" | "en";

  filter: DateFilter;

  setFilter: (value: DateFilter) => void;
}) {
  const { t } = useTranslation();

  const filteredShifts = filterByDate(
    shifts,

    (shift) => shift.startedAt,

    filter,
  );

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          {t("shifts.history", "Shift History")}
        </Text>

        <Text style={styles.resultCount}>{filteredShifts.length}</Text>
      </View>

      <DateFilterBar value={filter} onChange={setFilter} />

      {filteredShifts.length === 0 ? (
        <Text style={styles.emptyText}>
          {t("shifts.emptyForPeriod", "No shifts found for this period")}
        </Text>
      ) : (
        filteredShifts.map((shift) => (
          <View key={shift._id ?? shift.id} style={styles.shiftHistoryRow}>
            <Text style={styles.shiftHistoryTitle}>
              {shift.status === "active"
                ? t("shifts.active", "Active")
                : t("shifts.completed", "Completed")}
            </Text>

            <Text style={styles.shiftHistoryText}>
              {formatDateTime(shift.startedAt, language)}
            </Text>

            <Text style={styles.shiftHistoryText}>
              {formatDuration(shift.durationSeconds ?? 0)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function StatsPanel({ stats }: { stats: MyDashboardStatsResponse | null }) {
  const { t } = useTranslation();

  if (!stats) {
    return (
      <View style={styles.panelLoader}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitleStandalone}>
        {t("stats.title", "Statistics")}
      </Text>

      {(["today", "week", "month"] as const).map((period) => {
        const values = stats.stats[period];

        return (
          <View key={period} style={styles.statRow}>
            <Text style={styles.statTitle}>{t(`stats.${period}`, period)}</Text>

            <View style={styles.statValues}>
              <StatValue
                value={values.orders.total}
                label={t("stats.orders", "Orders")}
              />

              <StatValue
                value={values.orders.delivered}
                label={t("stats.delivered", "Delivered")}
              />

              <StatValue
                value={formatDuration(values.work.totalSeconds)}
                label={t("stats.workTime", "Work")}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function StatValue({
  value,
  label,
}: {
  value: string | number;

  label: string;
}) {
  return (
    <View style={styles.statValueBox}>
      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DriverTabs({
  activeTab,
  onChange,
}: {
  activeTab: DriverTabName;

  onChange: (tab: DriverTabName) => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.tabs}>
      <DriverTab
        title={t("driver.home", "Home")}
        active={activeTab === "home"}
        onPress={() => onChange("home")}
      />

      <DriverTab
        title={t("driver.orders", "Orders")}
        active={activeTab === "orders"}
        onPress={() => onChange("orders")}
      />

      <DriverTab
        title={t("driver.shifts", "Shifts")}
        active={activeTab === "shifts"}
        onPress={() => onChange("shifts")}
      />

      <DriverTab
        title={t("driver.stats", "Stats")}
        active={activeTab === "stats"}
        onPress={() => onChange("stats")}
      />
    </View>
  );
}

function DriverTab({
  title,
  active,
  onPress,
}: {
  title: string;

  active: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tab,

        active && styles.tabActive,

        pressed && styles.tabPressed,
      ]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

function safeDate(value?: string | null) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor((seconds % 3600) / 60);

  const remaining = seconds % 60;

  return [hours, minutes, remaining]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

const styles = StyleSheet.create({
  root: {
    flex: 1,

    backgroundColor: COLORS.light,
  },

  screen: {
    flex: 1,

    backgroundColor: COLORS.light,
  },

  fixedHeader: {
    width: "100%",
    maxWidth: 720,

    alignSelf: "center",

    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,

    backgroundColor: COLORS.light,

    zIndex: 10,
  },

  content: {
    width: "100%",
    maxWidth: 720,

    alignSelf: "center",

    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },

  greeting: {
    fontSize: 10,
    fontWeight: "600",

    color: COLORS.primary,
  },

  tabs: {
    flexDirection: "row",

    padding: 4,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 12,

    backgroundColor: COLORS.white,
  },

  tab: {
    flex: 1,

    height: 36,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,
  },

  tabActive: {
    backgroundColor: COLORS.primary,
  },

  tabPressed: {
    opacity: 0.7,
  },

  tabText: {
    fontSize: 10,
    fontWeight: "800",

    color: COLORS.muted,
  },

  tabTextActive: {
    color: COLORS.white,
  },

  homeContent: {
    marginTop: 12,
  },

  inlineOrderCard: {
    padding: 11,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: COLORS.white,
  },

  inlineOrderHeader: {
    flexDirection: "row",

    alignItems: "center",

    marginBottom: 9,
  },

  inlineOrderTitle: {
    fontSize: 13,

    fontWeight: "900",

    color: COLORS.primary,
  },

  inlineOrderTimer: {
    marginTop: 2,

    fontSize: 12,

    fontWeight: "900",

    color: COLORS.secondary,
  },

  noteButton: {
    width: 32,
    height: 32,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  inlinePhotoRow: {
    flexDirection: "row",

    alignItems: "center",
  },

  compactPhotoButton: {
    flex: 1,

    minHeight: 50,

    flexDirection: "row",

    alignItems: "center",

    padding: 6,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 10,

    backgroundColor: COLORS.light,
  },

  compactPhotoDisabled: {
    opacity: 0.5,
  },

  compactPhotoPressed: {
    opacity: 0.75,
  },

  compactPhotoPreview: {
    width: 38,
    height: 38,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.white,
  },

  compactPhotoImage: {
    width: "100%",
    height: "100%",
  },

  compactPhotoPlus: {
    fontSize: 21,

    fontWeight: "500",

    color: COLORS.primary,
  },

  compactPhotoText: {
    flex: 1,

    marginLeft: 7,
  },

  compactPhotoTitle: {
    fontSize: 10,

    fontWeight: "900",

    color: COLORS.primary,
  },

  compactPhotoStatus: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  photoConnector: {
    width: 27,

    alignItems: "center",

    justifyContent: "center",
  },

  photoConnectorLine: {
    position: "absolute",

    left: 0,
    right: 0,

    height: 1,

    backgroundColor: COLORS.border,
  },

  photoConnectorText: {
    paddingHorizontal: 4,

    fontSize: 12,

    color: COLORS.secondary,

    backgroundColor: COLORS.white,
  },

  notesEditor: {
    marginTop: 10,
  },

  notesInput: {
    minHeight: 68,

    paddingHorizontal: 10,

    paddingVertical: 8,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 10,

    backgroundColor: COLORS.light,

    color: COLORS.black,

    fontSize: 12,

    textAlignVertical: "top",
  },

  notesInputLocked: {
    opacity: 0.75,
  },

  notesFooter: {
    marginTop: 4,

    flexDirection: "row",

    justifyContent: "space-between",

    gap: 10,
  },

  notesHint: {
    flex: 1,

    fontSize: 8,

    color: COLORS.muted,
  },

  notesLockedText: {
    flex: 1,

    fontSize: 8,

    color: COLORS.success,
  },

  characterCount: {
    fontSize: 8,

    color: COLORS.muted,
  },

  startShiftHint: {
    marginTop: 8,

    fontSize: 9,

    color: COLORS.muted,

    textAlign: "center",
  },

  errorBox: {
    marginTop: 8,

    paddingHorizontal: 9,

    paddingVertical: 7,

    borderRadius: 8,

    backgroundColor: COLORS.errorBackground,
  },

  errorText: {
    fontSize: 10,

    color: COLORS.error,
  },

  shiftButton: {
    width: "100%",

    height: 48,

    marginTop: 10,

    paddingHorizontal: 14,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 12,

    backgroundColor: COLORS.primary,
  },

  shiftButtonWorking: {
    backgroundColor: COLORS.secondary,
  },

  shiftButtonPressed: {
    opacity: 0.82,
  },

  shiftDot: {
    width: 8,
    height: 8,

    borderRadius: 4,

    marginRight: 8,

    backgroundColor: "#A0A8A8",
  },

  shiftDotActive: {
    backgroundColor: "#A7F3D0",
  },

  shiftButtonContent: {
    alignItems: "center",
  },

  shiftButtonTitle: {
    fontSize: 11,

    fontWeight: "900",

    color: COLORS.white,
  },

  shiftButtonTimer: {
    marginTop: 1,

    fontSize: 11,

    fontWeight: "900",

    color: COLORS.white,
  },

  disabledButton: {
    opacity: 0.45,
  },

  recentSection: {
    marginTop: 5,
  },

  sectionTitle: {
    marginBottom: 4,

    fontSize: 13,

    fontWeight: "900",

    color: COLORS.primary,
  },

  completedOrderCard: {
    overflow: "hidden",

    marginBottom: 5,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 12,

    backgroundColor: COLORS.white,
  },

  historyOrderRow: {
    minHeight: 60,

    paddingHorizontal: 9,

    paddingVertical: 8,

    flexDirection: "row",

    alignItems: "center",
  },

  rowPressed: {
    backgroundColor: COLORS.light,
  },

  historyPhotos: {
    flexDirection: "row",

    alignItems: "center",
  },

  historyPhoto: {
    width: 34,
    height: 34,

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  historyArrow: {
    marginHorizontal: 4,

    fontSize: 10,

    color: COLORS.muted,
  },

  emptyHistoryPhoto: {
    alignItems: "center",

    justifyContent: "center",

    borderWidth: 1,

    borderStyle: "dashed",

    borderColor: COLORS.border,
  },

  emptyHistoryPhotoText: {
    fontSize: 9,

    fontWeight: "900",

    color: COLORS.muted,
  },

  historyInfo: {
    flex: 1,

    marginLeft: 9,
  },

  historyOrderTitle: {
    fontSize: 11,

    fontWeight: "900",

    color: COLORS.primary,
  },

  historyOrderMeta: {
    marginTop: 3,

    fontSize: 9,

    color: COLORS.muted,
  },

  activeBadge: {
    paddingHorizontal: 7,

    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: "#E5F1F2",
  },

  activeBadgeText: {
    fontSize: 8,

    fontWeight: "900",

    color: COLORS.primary,
  },

  doneBadge: {
    paddingHorizontal: 7,

    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: COLORS.successLight,
  },

  doneBadgeText: {
    fontSize: 8,

    fontWeight: "900",

    color: COLORS.success,
  },

  completedExpanded: {
    paddingHorizontal: 10,

    paddingBottom: 10,

    borderTopWidth: StyleSheet.hairlineWidth,

    borderTopColor: COLORS.border,

    backgroundColor: COLORS.light,
  },

  expandedLine: {
    flexDirection: "row",

    justifyContent: "space-between",

    marginTop: 8,

    gap: 10,
  },

  expandedLabel: {
    fontSize: 9,

    fontWeight: "700",

    color: COLORS.muted,
  },

  expandedValue: {
    flex: 1,

    fontSize: 9,

    fontWeight: "700",

    color: COLORS.black,

    textAlign: "right",
  },

  expandedNotes: {
    marginTop: 8,

    fontSize: 10,

    lineHeight: 15,

    color: COLORS.black,
  },

  panel: {
    marginTop: 12,

    padding: 12,

    borderWidth: 1,

    borderColor: COLORS.border,

    borderRadius: 14,

    backgroundColor: COLORS.white,
  },

  panelHeader: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginBottom: 7,
  },

  panelTitle: {
    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  panelTitleStandalone: {
    marginBottom: 9,

    fontSize: 14,

    fontWeight: "900",

    color: COLORS.primary,
  },

  resultCount: {
    minWidth: 22,

    height: 22,

    paddingHorizontal: 6,

    borderRadius: 11,

    textAlign: "center",

    textAlignVertical: "center",

    backgroundColor: COLORS.secondary,

    color: COLORS.white,

    fontSize: 9,

    fontWeight: "900",
  },

  dateFilters: {
    flexDirection: "row",

    gap: 5,

    marginBottom: 10,

    padding: 3,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  dateFilterButton: {
    flex: 1,

    height: 28,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 7,
  },

  dateFilterButtonActive: {
    backgroundColor: COLORS.primary,
  },

  dateFilterButtonPressed: {
    opacity: 0.7,
  },

  dateFilterText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.muted,
  },

  dateFilterTextActive: {
    color: COLORS.white,
  },

  panelLoader: {
    minHeight: 120,

    alignItems: "center",

    justifyContent: "center",
  },

  emptyText: {
    fontSize: 11,

    color: COLORS.muted,
  },

  shiftHistoryRow: {
    marginBottom: 8,

    padding: 10,

    borderRadius: 10,

    backgroundColor: COLORS.light,
  },

  shiftHistoryTitle: {
    fontSize: 11,

    fontWeight: "900",

    color: COLORS.primary,
  },

  shiftHistoryText: {
    marginTop: 3,

    fontSize: 10,

    color: COLORS.muted,
  },

  statRow: {
    marginBottom: 9,

    padding: 10,

    borderRadius: 11,

    backgroundColor: COLORS.light,
  },

  statTitle: {
    marginBottom: 8,

    fontSize: 11,

    fontWeight: "900",

    color: COLORS.primary,

    textTransform: "capitalize",
  },

  statValues: {
    flexDirection: "row",

    gap: 7,
  },

  statValueBox: {
    flex: 1,

    paddingVertical: 8,

    alignItems: "center",

    borderRadius: 9,

    backgroundColor: COLORS.white,
  },

  statValue: {
    fontSize: 12,

    fontWeight: "900",

    color: COLORS.primary,
  },

  statLabel: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  finishShiftOverlay: {
    flex: 1,

    paddingHorizontal: 20,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(10, 9, 12, 0.5)",
  },

  finishShiftModal: {
    width: "100%",
    maxWidth: 380,

    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,

    alignItems: "center",

    borderRadius: 18,

    backgroundColor: COLORS.white,
  },

  finishShiftIcon: {
    width: 46,
    height: 46,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 23,

    backgroundColor: COLORS.successLight,
  },

  finishShiftIconText: {
    fontSize: 20,
    fontWeight: "900",

    color: COLORS.success,
  },

  finishShiftTitle: {
    marginTop: 12,

    fontSize: 17,
    fontWeight: "900",

    color: COLORS.primary,

    textAlign: "center",
  },

  finishShiftDescription: {
    marginTop: 6,

    paddingHorizontal: 8,

    fontSize: 10,
    lineHeight: 15,

    color: COLORS.muted,

    textAlign: "center",
  },

  finishShiftTime: {
    width: "100%",

    marginTop: 14,

    paddingVertical: 10,

    alignItems: "center",

    borderRadius: 10,

    backgroundColor: COLORS.light,
  },

  finishShiftTimeLabel: {
    fontSize: 8,
    fontWeight: "700",

    color: COLORS.muted,
  },

  finishShiftTimeValue: {
    marginTop: 2,

    fontSize: 18,
    fontWeight: "900",

    color: COLORS.primary,
  },

  finishShiftButton: {
    width: "100%",
    height: 42,

    marginTop: 14,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.primary,
  },

  finishShiftButtonPressed: {
    opacity: 0.82,
  },

  finishShiftButtonText: {
    fontSize: 11,
    fontWeight: "900",

    color: COLORS.white,
  },

  continueShiftButton: {
    height: 38,

    marginTop: 5,

    paddingHorizontal: 20,

    alignItems: "center",
    justifyContent: "center",
  },

  continueShiftButtonPressed: {
    opacity: 0.6,
  },

  continueShiftText: {
    fontSize: 10,
    fontWeight: "800",

    color: COLORS.secondary,
  },
  orderHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  orderMenuButton: {
    width: 32,
    height: 32,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },
  cancelOverlay: {
    flex: 1,

    paddingHorizontal: 16,
    paddingVertical: 30,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "rgba(10,9,12,0.52)",
  },

  cancelModal: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "88%",

    padding: 14,

    borderRadius: 16,

    backgroundColor: COLORS.white,
  },

  cancelHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 12,
  },

  cancelTitle: {
    fontSize: 15,
    fontWeight: "900",

    color: COLORS.error,
  },

  cancelSubtitle: {
    marginTop: 2,

    fontSize: 9,
    lineHeight: 13,

    color: COLORS.muted,
  },

  cancelClose: {
    width: 31,
    height: 31,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  cancelSectionLabel: {
    marginBottom: 6,

    fontSize: 10,
    fontWeight: "900",

    color: COLORS.primary,
  },

  reasonList: {
    flexDirection: "row",
    flexWrap: "wrap",

    gap: 6,

    marginBottom: 13,
  },

  reasonChip: {
    paddingHorizontal: 9,
    paddingVertical: 7,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 999,

    backgroundColor: COLORS.light,
  },

  reasonChipSelected: {
    borderColor: COLORS.primary,

    backgroundColor: COLORS.primary,
  },

  reasonChipText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.primary,
  },

  reasonChipTextSelected: {
    color: COLORS.white,
  },

  cancelNotesInput: {
    minHeight: 75,

    marginBottom: 13,

    paddingHorizontal: 10,
    paddingVertical: 9,

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 10,

    backgroundColor: COLORS.light,

    fontSize: 10,

    color: COLORS.black,

    textAlignVertical: "top",
  },

  cancelPhotoHeader: {
    flexDirection: "row",
    alignItems: "center",

    marginBottom: 7,
  },

  cancelPhotoHint: {
    marginTop: -3,

    fontSize: 8,

    color: COLORS.muted,
  },

  cancelPhotoCount: {
    fontSize: 9,
    fontWeight: "800",

    color: COLORS.secondary,
  },

  cancelPhotos: {
    flexDirection: "row",
    flexWrap: "wrap",

    gap: 7,
  },

  cancelPhotoItem: {
    width: 66,
    height: 66,

    borderRadius: 9,

    overflow: "hidden",

    backgroundColor: COLORS.light,
  },

  cancelPhotoImage: {
    width: "100%",
    height: "100%",
  },

  removeCancelPhoto: {
    position: "absolute",

    top: 4,
    right: 4,

    width: 22,
    height: 22,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 11,

    backgroundColor: "rgba(185,28,28,0.9)",
  },

  addCancelPhoto: {
    width: 66,
    height: 66,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.secondary,

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  addCancelPhotoText: {
    marginTop: 3,

    fontSize: 8,
    fontWeight: "800",

    color: COLORS.primary,
  },

  confirmCancelButton: {
    height: 42,

    marginTop: 15,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 10,

    backgroundColor: COLORS.error,
  },

  confirmCancelPressed: {
    opacity: 0.8,
  },

  confirmCancelText: {
    fontSize: 10,
    fontWeight: "900",

    color: COLORS.white,
  },

  orderStatusFilters: {
    flexDirection: "row",

    gap: 6,

    marginBottom: 10,
  },

  orderStatusFilterButton: {
    flex: 1,

    height: 30,

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: 8,

    backgroundColor: COLORS.white,
  },

  orderStatusFilterButtonActive: {
    borderColor: COLORS.primary,

    backgroundColor: COLORS.primary,
  },

  orderStatusFilterCancelledActive: {
    borderColor: COLORS.error,

    backgroundColor: COLORS.error,
  },

  orderStatusFilterText: {
    fontSize: 8,
    fontWeight: "800",

    color: COLORS.muted,
  },

  orderStatusFilterTextActive: {
    color: COLORS.white,
  },

  cancelledBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: COLORS.errorBackground,
  },

  cancelledBadgeText: {
    fontSize: 8,
    fontWeight: "900",

    color: COLORS.error,
  },
  photoUploadingOverlay: {
  ...StyleSheet.absoluteFill,

  alignItems: "center",
  justifyContent: "center",

  borderRadius: 8,

  backgroundColor:
    "rgba(0, 0, 0, 0.28)",
},
});
