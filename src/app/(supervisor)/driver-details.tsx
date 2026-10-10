import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  Bike,
  CalendarDays,
  Camera,
  Car,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  MessageCircle,
  Pencil,
  PersonStanding,
  Phone,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

import {
  getDriverById,
  updateDriver,
  updateDriverStatus,
} from "../../api/driverApi";
import {
  getSupervisorOrderCalendar,
  getSupervisorOrders,
} from "../../api/orderApi";
import { AppScreen } from "../../components/AppScreen";
import { useAuth } from "../../hooks/useAuth";
import type {
  Driver,
  UpdateDriverPayload,
  VehicleType,
} from "../../types/driver";
import type { Order } from "../../types/order";
import { getErrorMessage } from "../../utils";

type DriverDetailsUser = Omit<Driver, "role"> & {
  role: "driver" | "supervisor";
  isSupervisorSelf?: boolean;
};

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
  warning: "#92400E",
  warningBackground: "#FEF3C7",
};

const HISTORY_PAGE_SIZE = 10;

type HistoryDateFilter = "today" | "week" | "month" | "custom";

function formatDateForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthForApi(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getHistoryRange(filter: Exclude<HistoryDateFilter, "custom">) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (filter === "week") {
    // Saudi working week display: Sunday -> today.
    start.setDate(end.getDate() - end.getDay());
  }

  if (filter === "month") {
    start.setDate(1);
  }

  return {
    from: formatDateForApi(start),
    to: formatDateForApi(end),
  };
}

function formatSimpleDate(value: string) {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatOrderDateTime(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCancellationReason(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function DriverDetailsScreen() {
  const { t } = useTranslation();
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const { user } = useAuth();

  const [driver, setDriver] = useState<DriverDetailsUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editVehicleType, setEditVehicleType] = useState<VehicleType | null>(
    null,
  );
  const [editProfilePictureUri, setEditProfilePictureUri] = useState<
    string | null
  >(null);
  const [editIqamaId, setEditIqamaId] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [isUpdatingDriver, setIsUpdatingDriver] = useState(false);

  const today = useMemo(() => formatDateForApi(new Date()), []);
  const currentMonth = useMemo(() => formatMonthForApi(new Date()), []);

  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyDateFilter, setHistoryDateFilter] =
    useState<HistoryDateFilter>("today");

  // The selected history interval. Same date = single-day history.
  const [historyFrom, setHistoryFrom] = useState(today);
  const [historyTo, setHistoryTo] = useState(today);

  // First tap sets an anchor. Second different tap completes a range.
  const [rangeAnchor, setRangeAnchor] = useState<string | null>(null);

  const [visibleMonth, setVisibleMonth] = useState(
    formatMonthForApi(new Date()),
  );
  const [calendarCounts, setCalendarCounts] = useState<Record<string, number>>(
    {},
  );
  const [calendarLoading, setCalendarLoading] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isSupervisorSelf =
    user?.role === "supervisor" &&
    user?.canDeliverOrders === true &&
    driverId === user.id;

  const loadDriver = useCallback(async () => {
    if (!driverId || !user) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const isSelf =
        user.role === "supervisor" &&
        user.canDeliverOrders === true &&
        driverId === user.id;

      if (isSelf) {
        const selfDriver: DriverDetailsUser = {
          _id: user.id,
          id: user.id,
          iqamaId: user.iqamaId,
          name: user.name,
          shortName: user.name,
          phone: user.phone ?? null,
          role: "supervisor",
          isActive: user.isActive,
          supervisor: null,
          workStatus: "not_started",
          isSupervisorSelf: true,
        };

        setDriver(selfDriver);
        return;
      }

      const response = await getDriverById(driverId);
      setDriver(response.driver);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.detailsLoadFailed", "Unable to load driver"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [driverId, user, t]);

  const loadCalendarCounts = useCallback(async () => {
    if (!driverId) {
      return;
    }

    try {
      setCalendarLoading(true);

      const response = await getSupervisorOrderCalendar(driverId, visibleMonth);

      setCalendarCounts(response.days ?? {});
    } catch (err) {
      setCalendarCounts({});

      // History itself can still work if the calendar-count request fails.
      console.warn(
        "[DriverDetails] Unable to load calendar counts",
        getErrorMessage(err, "Unable to load calendar counts"),
      );
    } finally {
      setCalendarLoading(false);
    }
  }, [driverId, visibleMonth]);

  const loadOrderHistory = useCallback(async () => {
    if (!driverId || !historyFrom || !historyTo) {
      return;
    }

    try {
      setHistoryLoading(true);
      setHistoryError(null);

      const response = await getSupervisorOrders({
        page: historyPage,
        limit: HISTORY_PAGE_SIZE,
        driverId,
        status: "all",
        from: historyFrom,
        to: historyTo,
      });

      setHistoryOrders(response.orders ?? []);
      setHistoryTotal(response.pagination?.total ?? 0);
      setHistoryTotalPages(response.pagination?.totalPages ?? 1);
    } catch (err) {
      setHistoryOrders([]);
      setHistoryTotal(0);
      setHistoryTotalPages(1);

      setHistoryError(
        getErrorMessage(
          err,
          t("orders.historyLoadFailed", "Unable to load order history"),
        ),
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [driverId, historyFrom, historyTo, historyPage, t]);

  useEffect(() => {
    void loadDriver();
  }, [loadDriver]);

  useEffect(() => {
    if (historyDateFilter === "custom") {
      void loadCalendarCounts();
    }
  }, [historyDateFilter, loadCalendarCounts]);

  useEffect(() => {
    void loadOrderHistory();
  }, [loadOrderHistory]);

  const applyHistoryDateFilter = useCallback(
    (filter: HistoryDateFilter) => {
      setHistoryDateFilter(filter);
      setHistoryPage(1);
      setRangeAnchor(null);

      if (filter === "custom") {
        setVisibleMonth(formatMonthForApi(new Date(`${historyFrom}T12:00:00`)));
        return;
      }

      const range = getHistoryRange(filter);
      setHistoryFrom(range.from);
      setHistoryTo(range.to);
      setVisibleMonth(currentMonth);
    },
    [currentMonth, historyFrom],
  );

  const handleHistoryDayPress = useCallback(
    (day: DateData) => {
      const selectedDate = day.dateString;

      // Future history cannot exist, so future days are never selectable.
      if (selectedDate > today) {
        return;
      }

      // No active anchor: start a new selection and immediately show that day.
      if (!rangeAnchor) {
        setHistoryFrom(selectedDate);
        setHistoryTo(selectedDate);
        setRangeAnchor(selectedDate);
        setHistoryPage(1);
        return;
      }

      // Same date again keeps the selection as one day and finishes selection.
      if (selectedDate === rangeAnchor) {
        setHistoryFrom(selectedDate);
        setHistoryTo(selectedDate);
        setRangeAnchor(null);
        setHistoryPage(1);
        return;
      }

      // Second different date creates the range regardless of tap order.
      const from = selectedDate < rangeAnchor ? selectedDate : rangeAnchor;
      const to = selectedDate > rangeAnchor ? selectedDate : rangeAnchor;

      setHistoryFrom(from);
      setHistoryTo(to);
      setRangeAnchor(null);
      setHistoryPage(1);
    },
    [rangeAnchor, today],
  );

  const openEditDriver = () => {
    if (!driver) {
      return;
    }

    setEditName(driver.name ?? "");
    setEditShortName(driver.shortName ?? "");
    setEditIqamaId(driver.iqamaId ?? "");
    setEditPhone(driver.phone ?? "");
    setEditVehicleType(driver.vehicleType ?? null);
    setEditProfilePictureUri(null);
    setEditPassword("");
    setError(null);
    setEditVisible(true);
  };

  const closeEditDriver = () => {
    if (isUpdatingDriver) {
      return;
    }

    setEditVisible(false);
  };

  const handleUpdateDriver = async () => {
    if (!driver || !driverId || isUpdatingDriver) {
      return;
    }

    const name = editName.trim();
    const shortName = editShortName.trim();
    const iqamaId = editIqamaId.trim();
    const phone = editPhone.trim();
    const password = editPassword.trim();

    if (!name) {
      setError(t("drivers.nameRequired", "Driver name is required"));
      return;
    }

    if (shortName.length > 30) {
      setError(
        t(
          "drivers.shortNameLength",
          "Short name must not exceed 30 characters",
        ),
      );
      return;
    }

    if (!iqamaId) {
      setError(t("drivers.iqamaRequired", "Iqama ID is required"));
      return;
    }

    if (password && password.length < 6) {
      setError(
        t("drivers.passwordLength", "Password must be at least 6 characters"),
      );
      return;
    }

    try {
      setIsUpdatingDriver(true);
      setError(null);

      const payload: UpdateDriverPayload = {
        name,
        shortName: shortName || null,
        iqamaId,
        phone: phone || null,
        vehicleType: editVehicleType,
        profilePictureUri: editProfilePictureUri,
      };

      if (password) {
        payload.password = password;
      }

      const response = await updateDriver(driverId, payload);

      setDriver(response.driver);
      setEditPassword("");
      setEditProfilePictureUri(null);
      setEditVisible(false);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.updateFailed", "Unable to update driver"),
        ),
      );
    } finally {
      setIsUpdatingDriver(false);
    }
  };

  const pickProfilePicture = async () => {
    if (isUpdatingDriver) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        t("common.permissionRequired", "Permission Required"),
        t(
          "drivers.photoPermission",
          "Photo library permission is required to select a profile picture.",
        ),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setEditProfilePictureUri(result.assets[0].uri);
  };

  const handleStatusPress = () => {
    if (!driver) {
      return;
    }

    if (!driver.isActive) {
      void toggleStatus();
      return;
    }

    Alert.alert(
      t("drivers.deactivateConfirmTitle", "Deactivate Driver?"),
      t(
        "drivers.deactivateConfirmMessage",
        "Are you sure you want to deactivate this driver? The driver will no longer be able to use the app until activated again.",
      ),
      [
        {
          text: t("common.cancel", "Cancel"),
          style: "cancel",
        },
        {
          text: t("drivers.deactivate", "Deactivate Driver"),
          style: "destructive",
          onPress: () => {
            void toggleStatus();
          },
        },
      ],
    );
  };

  const toggleStatus = async () => {
    if (!driver || !driverId || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setError(null);

      const response = await updateDriverStatus(driverId, !driver.isActive);

      setDriver((current) =>
        current
          ? {
              ...current,
              isActive: response.driver.isActive,
            }
          : current,
      );
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("drivers.statusFailed", "Unable to update driver status"),
        ),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCall = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForCall(driver.phone);
      await Linking.openURL(`tel:${phone}`);
    } catch {
      setError(t("drivers.callFailed", "Unable to open the phone app"));
    }
  };

  const handleWhatsApp = async () => {
    if (!driver?.phone) {
      return;
    }

    try {
      const phone = normalizePhoneForWhatsApp(driver.phone);
      await Linking.openURL(`https://wa.me/${phone}`);
    } catch {
      setError(t("drivers.whatsappFailed", "Unable to open WhatsApp"));
    }
  };

  const selectedRangeText =
    historyFrom === historyTo
      ? formatSimpleDate(historyFrom)
      : `${formatSimpleDate(historyFrom)} → ${formatSimpleDate(historyTo)}`;

  return (
    <AppScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>← {t("common.back", "Back")}</Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : error && !driver ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : driver ? (
          <>
            <View style={styles.card}>
              <View style={styles.driverCardHeader}>
                <View style={styles.driverIdentity}>
                  <View style={styles.driverAvatar}>
                    {driver.profilePicture?.url ? (
                      <Image
                        source={{ uri: driver.profilePicture.url }}
                        style={styles.driverAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <DriverVehicleIcon
                        vehicleType={driver.vehicleType}
                        size={24}
                        color={COLORS.white}
                      />
                    )}
                  </View>

                  <View style={styles.driverIdentityText}>
                    <Text style={styles.driverPrimaryName} numberOfLines={1}>
                      {driver.shortName || driver.name}
                    </Text>

                    {!!driver.shortName && (
                      <Text style={styles.driverFullName} numberOfLines={1}>
                        {driver.name}
                      </Text>
                    )}

                    {isSupervisorSelf && (
                      <Text style={styles.supervisorModeText}>
                        {t(
                          "drivers.supervisorDriverMode",
                          "Supervisor • Driver Mode",
                        )}
                      </Text>
                    )}
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    driver.isActive ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      driver.isActive ? styles.activeText : styles.inactiveText,
                    ]}
                  >
                    {driver.isActive
                      ? t("common.active", "Active")
                      : t("common.inactive", "Inactive")}
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <Text style={styles.cardTitle}>
                {t("drivers.information", "Driver Information")}
              </Text>

              <View style={styles.twoColumnRow}>
                <InfoRow
                  label={t("drivers.fullName", "Full Name")}
                  value={driver.name}
                />

                <InfoRow
                  label={t("drivers.shortName", "Short Name")}
                  value={driver.shortName || "-"}
                />
              </View>

              <View style={styles.twoColumnRow}>
                <InfoRow
                  label={t("drivers.vehicleType", "Vehicle Type")}
                  value={
                    driver.vehicleType === "car"
                      ? t("drivers.car", "Car")
                      : driver.vehicleType === "bike"
                        ? t("drivers.bike", "Bike")
                        : t("drivers.walking", "Walking")
                  }
                />

                <InfoRow
                  label={t("profile.iqama", "Iqama ID")}
                  value={driver.iqamaId}
                />
              </View>

              <PhoneRow
                label={t("profile.phone", "Phone")}
                value={driver.phone || "-"}
                hasPhone={!!driver.phone}
                onCall={handleCall}
                onWhatsApp={handleWhatsApp}
              />

              {!isSupervisorSelf && (
                <View style={styles.driverActionsRow}>
                  <Pressable
                    onPress={openEditDriver}
                    style={({ pressed }) => [
                      styles.editDriverButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Pencil size={15} color={COLORS.primary} />
                    <Text style={styles.editDriverButtonText}>
                      {t("common.edit", "Edit")}
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={isUpdatingStatus}
                    onPress={handleStatusPress}
                    style={({ pressed }) => [
                      styles.inlineStatusButton,
                      driver.isActive
                        ? styles.inlineDeactivateButton
                        : styles.inlineActivateButton,
                      pressed && styles.buttonPressed,
                      isUpdatingStatus && styles.buttonDisabled,
                    ]}
                  >
                    {isUpdatingStatus ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.inlineStatusButtonText}>
                        {driver.isActive
                          ? t("drivers.deactivate", "Deactivate Driver")
                          : t("drivers.activate", "Activate Driver")}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.historyHeader}>
                <View style={styles.historyHeadingText}>
                  <Text style={styles.cardTitleNoMargin}>
                    {t("orders.history", "Order History")}
                  </Text>

                  <Text style={styles.historySubtitle}>
                    ( {historyTotal} ) {t("orders.orders", "orders")}
                  </Text>
                </View>

                <View style={styles.calendarIconBox}>
                  {calendarLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <CalendarDays size={18} color={COLORS.primary} />
                  )}
                </View>
              </View>

              <View style={styles.historyFilterRow}>
                {(
                  [
                    ["today", t("stats.today", "Today")],
                    ["week", t("stats.week", "Week")],
                    ["month", t("stats.month", "Month")],
                    ["custom", t("common.custom", "Custom")],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => applyHistoryDateFilter(value)}
                    style={({ pressed }) => [
                      styles.historyFilterButton,
                      historyDateFilter === value &&
                        styles.historyFilterButtonActive,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.historyFilterText,
                        historyDateFilter === value &&
                          styles.historyFilterTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {historyDateFilter === "custom" && (
                <>
                  <Text style={styles.calendarHelp}>
                    {t(
                      "orders.driverHistoryCalendarHelp",
                      "Tap a day to show only that day's orders. Tap another day to select a date range.",
                    )}
                  </Text>

                  <View style={styles.calendarWrapper}>
                    <Calendar
                      current={historyFrom}
                      enableSwipeMonths={false}
                      firstDay={0}
                      hideExtraDays={false}
                      onMonthChange={(month) => {
                        const nextMonth = `${month.year}-${String(month.month).padStart(2, "0")}`;

                        if (nextMonth <= currentMonth) {
                          setVisibleMonth(nextMonth);
                        }
                      }}
                      dayComponent={({ date, state }) => {
                        if (!date) {
                          return null;
                        }

                        const value = date.dateString;
                        const count = calendarCounts[value] ?? 0;
                        const isSelected =
                          value >= historyFrom && value <= historyTo;
                        const isEdge =
                          value === historyFrom || value === historyTo;
                        const isAnchor = value === rangeAnchor;
                        const isOutsideMonth = state === "disabled";
                        const isFuture = value > today;
                        const isDisabled = isOutsideMonth || isFuture;

                        return (
                          <Pressable
                            disabled={isDisabled}
                            onPress={() => handleHistoryDayPress(date)}
                            style={[
                              styles.calendarDay,
                              isDisabled && styles.calendarDayDisabledContainer,
                              isSelected && styles.calendarDaySelected,
                              isEdge && styles.calendarDayEdge,
                              isAnchor && styles.calendarDayAnchor,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayNumber,
                                isDisabled && styles.calendarDayDisabled,
                                isSelected && styles.calendarDayNumberSelected,
                              ]}
                            >
                              {date.day}
                            </Text>

                            <View
                              style={[
                                styles.calendarCountBadge,
                                count > 0 && styles.calendarCountBadgeHasOrders,
                                isSelected && styles.calendarCountBadgeSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.calendarCountText,
                                  count > 0 &&
                                    styles.calendarCountTextHasOrders,
                                  isSelected &&
                                    styles.calendarCountTextSelected,
                                ]}
                              >
                                {count}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      }}
                      theme={{
                        calendarBackground: COLORS.white,
                        arrowColor: COLORS.primary,
                        monthTextColor: COLORS.primary,
                        textMonthFontWeight: "800",
                        textMonthFontSize: 14,
                        textDayHeaderFontSize: 9,
                        textSectionTitleColor: COLORS.muted,
                      }}
                      maxDate={today}
                      disableArrowRight={visibleMonth >= currentMonth}
                      onPressArrowRight={(addMonth) => {
                        if (visibleMonth < currentMonth) {
                          addMonth();
                        }
                      }}
                    />
                  </View>
                </>
              )}

              <View style={styles.selectedRangeBox}>
                <View style={styles.selectedRangeBoxInside}>
                  <Text style={styles.selectedRangeLabel}>
                    {historyFrom === historyTo
                      ? t("orders.selectedDay", "Selected Day")
                      : t("orders.selectedRange", "Selected Range")}
                  </Text>

                  <Text style={styles.selectedRangeValue}>
                    {selectedRangeText}
                  </Text>
                </View>

                {rangeAnchor && (
                  <View style={styles.rangePendingBadge}>
                    <Text style={styles.rangePendingText}>
                      {t("orders.selectEndDate", "Select end date")}
                    </Text>
                  </View>
                )}
              </View>

              {historyLoading ? (
                <View style={styles.historyLoader}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.historyLoadingText}>
                    {t("orders.loadingHistory", "Loading order history...")}
                  </Text>
                </View>
              ) : historyError ? (
                <View style={styles.historyErrorBox}>
                  <Text style={styles.errorText}>{historyError}</Text>

                  <Pressable
                    onPress={() => void loadOrderHistory()}
                    style={({ pressed }) => [
                      styles.historyRetryButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.historyRetryText}>
                      {t("common.retry", "Retry")}
                    </Text>
                  </Pressable>
                </View>
              ) : historyOrders.length === 0 ? (
                <View style={styles.historyEmpty}>
                  <Text style={styles.historyEmptyTitle}>
                    {t("orders.noHistory", "No orders found")}
                  </Text>

                  <Text style={styles.historyEmptyText}>
                    {historyFrom === historyTo
                      ? t(
                          "orders.noOrdersSelectedDay",
                          "No orders were found for this day.",
                        )
                      : t(
                          "orders.noOrdersSelectedRange",
                          "No orders were found for this date range.",
                        )}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.historyList}>
                    {historyOrders.map((order) => (
                      <DriverOrderHistoryCard
                        key={order._id}
                        order={order}
                        onImagePress={setPreviewImage}
                      />
                    ))}
                  </View>

                  <Pagination
                    page={historyPage}
                    totalPages={historyTotalPages}
                    onPrevious={() =>
                      setHistoryPage((current) => Math.max(1, current - 1))
                    }
                    onNext={() =>
                      setHistoryPage((current) =>
                        Math.min(historyTotalPages, current + 1),
                      )
                    }
                  />
                </>
              )}
            </View>

            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </>
        ) : null}

        <EditDriverModal
          visible={editVisible}
          name={editName}
          shortName={editShortName}
          iqamaId={editIqamaId}
          phone={editPhone}
          password={editPassword}
          vehicleType={editVehicleType}
          existingProfilePictureUrl={driver?.profilePicture?.url ?? null}
          selectedProfilePictureUri={editProfilePictureUri}
          loading={isUpdatingDriver}
          onNameChange={setEditName}
          onShortNameChange={setEditShortName}
          onIqamaChange={setEditIqamaId}
          onPhoneChange={setEditPhone}
          onPasswordChange={setEditPassword}
          onVehicleTypeChange={setEditVehicleType}
          onPickProfilePicture={() => void pickProfilePicture()}
          onClose={closeEditDriver}
          onSave={() => void handleUpdateDriver()}
        />
      </ScrollView>

      <ImagePreviewModal
        uri={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </AppScreen>
  );
}

function DriverOrderHistoryCard({
  order,
  onImagePress,
}: {
  order: Order;
  onImagePress: (uri: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const delivered = order.status === "delivered";
  const cancelled = order.status === "cancelled";
  const active = order.status === "picked_up";

  return (
    <View style={styles.historyCard}>
      <Pressable
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => [
          styles.historySummaryRow,
          pressed && styles.historySummaryPressed,
        ]}
      >
        <View style={styles.historySummaryMain}>
          <Text style={styles.historyOrderTitle} numberOfLines={1}>
            {order.orderId
              ? `Orderrrr #${order.orderId}`
              : t("orders.order", "Order")}
          </Text>
          <View style={styles.timeRow}>
            <Text style={styles.historyCreatedAt} numberOfLines={1}>
              {formatOrderDateTime(order.createdAt)} |
            </Text>
            <Text style={styles.historyCreatedAt} numberOfLines={1}>
              {formatOrderDateTime(
                order.deliveryTime ? order.deliveryTime : order.pickupTime,
              )}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.historyStatus,
            active && styles.historyActive,
            delivered && styles.historyDelivered,
            cancelled && styles.historyCancelled,
          ]}
        >
          <Text
            style={[
              styles.historyStatusText,
              active && styles.historyActiveText,
              delivered && styles.historyDeliveredText,
              cancelled && styles.historyCancelledText,
            ]}
          >
            {active
              ? t("orders.active", "Active")
              : delivered
                ? t("orders.delivered", "Delivered")
                : t("orders.cancelled", "Cancelled")}
          </Text>
        </View>

        <View style={styles.historyExpandIcon}>
          {expanded ? (
            <ChevronUp size={17} color={COLORS.primary} />
          ) : (
            <ChevronDown size={17} color={COLORS.primary} />
          )}
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.historyExpandedContent}>
          <View style={styles.historyImages}>
            <HistoryImage
              label={t("orders.pickup", "Pickup")}
              uri={order.pickupPhoto?.url}
              onPress={onImagePress}
            />

            {delivered && (
              <HistoryImage
                label={t("orders.deliveryPhoto", "Delivery")}
                uri={order.deliveryPhoto?.url}
                onPress={onImagePress}
              />
            )}
          </View>

          {cancelled && !!order.cancellationPhotos?.length && (
            <>
              <Text style={styles.evidenceTitle}>
                {t("orders.cancelPhotos", "Cancellation Evidence")}
              </Text>

              <ScrollView
                horizontal
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.evidenceRow}
              >
                {order.cancellationPhotos.map((photo, index) => (
                  <Pressable
                    key={`${photo.url}-${index}`}
                    onPress={() => onImagePress(photo.url)}
                  >
                    <Image
                      source={{ uri: photo.url }}
                      style={styles.evidenceImage}
                      resizeMode="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.historyDetails}>
            <HistoryDetail
              label={t("orders.pickupTime", "Pickup")}
              value={formatOrderDateTime(order.pickupTime)}
            />

            {delivered && order.deliveryTime && (
              <HistoryDetail
                label={t("orders.deliveryTime", "Delivery")}
                value={formatOrderDateTime(order.deliveryTime)}
              />
            )}

            {cancelled && order.cancelledAt && (
              <HistoryDetail
                label={t("orders.cancelledAt", "Cancelled")}
                value={formatOrderDateTime(order.cancelledAt)}
              />
            )}

            {cancelled && !!order.cancellationReason && (
              <HistoryDetail
                label={t("orders.cancelReason", "Reason")}
                value={formatCancellationReason(order.cancellationReason)}
              />
            )}

            {cancelled && !!order.cancellationNotes && (
              <Text style={styles.historyNotes}>{order.cancellationNotes}</Text>
            )}

            {!!order.notes && (
              <Text style={styles.historyNotes}>{order.notes}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function HistoryImage({
  label,
  uri,
  onPress,
}: {
  label: string;
  uri?: string | null;
  onPress: (uri: string) => void;
}) {
  return (
    <View style={styles.historyImageBox}>
      <Text style={styles.historyImageLabel}>{label}</Text>

      {uri ? (
        <Pressable onPress={() => onPress(uri)}>
          <Image
            source={{ uri }}
            style={styles.historyImage}
            resizeMode="cover"
          />

          <View style={styles.tapImageHint}>
            <Text style={styles.tapImageHintText}>View</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.historyImageEmpty}>
          <Text style={styles.historyImageEmptyText}>-</Text>
        </View>
      )}
    </View>
  );
}

function HistoryDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.historyDetailRow}>
      <Text style={styles.historyDetailLabel}>{label}</Text>
      <Text style={styles.historyDetailValue}>{value}</Text>
    </View>
  );
}

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  return (
    <View style={styles.pagination}>
      <Pressable
        disabled={page <= 1}
        onPress={onPrevious}
        style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
      >
        <Text style={styles.pageButtonText}>
          {t("common.previous", "Previous")}
        </Text>
      </Pressable>

      <Text style={styles.pageNumber}>
        {page} / {totalPages}
      </Text>

      <Pressable
        disabled={page >= totalPages}
        onPress={onNext}
        style={[
          styles.pageButton,
          page >= totalPages && styles.pageButtonDisabled,
        ]}
      >
        <Text style={styles.pageButtonText}>{t("common.next", "Next")}</Text>
      </Pressable>
    </View>
  );
}

function ImagePreviewModal({
  uri,
  onClose,
}: {
  uri: string | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.imageModalOverlay}>
        <Pressable style={styles.imageModalBackground} onPress={onClose} />

        <View style={styles.imageModalContent}>
          <Pressable onPress={onClose} style={styles.imageModalClose}>
            <X size={24} color={COLORS.white} />
          </Pressable>

          {uri && (
            <Image
              source={{ uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function EditDriverModal({
  visible,

  name,

  shortName,

  iqamaId,

  phone,

  password,

  vehicleType,

  existingProfilePictureUrl,

  selectedProfilePictureUri,

  loading,

  onNameChange,

  onShortNameChange,

  onIqamaChange,

  onPhoneChange,

  onPasswordChange,

  onVehicleTypeChange,

  onPickProfilePicture,

  onClose,

  onSave,
}: {
  visible: boolean;

  name: string;

  shortName: string;

  iqamaId: string;

  phone: string;

  password: string;

  vehicleType: VehicleType | null;

  existingProfilePictureUrl: string | null;

  selectedProfilePictureUri: string | null;

  loading: boolean;

  onNameChange: (value: string) => void;

  onShortNameChange: (value: string) => void;

  onIqamaChange: (value: string) => void;

  onPhoneChange: (value: string) => void;

  onPasswordChange: (value: string) => void;

  onVehicleTypeChange: (value: VehicleType | null) => void;

  onPickProfilePicture: () => void;

  onClose: () => void;

  onSave: () => void;
}) {
  const { t } = useTranslation();

  const profileUri = selectedProfilePictureUri || existingProfilePictureUrl;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.editModalOverlay}>
        <View style={styles.editModalCard}>
          <View style={styles.editModalHeader}>
            <View
              style={{
                flex: 1,
              }}
            >
              <Text style={styles.editModalTitle}>
                {t("drivers.editDriver", "Edit Driver")}
              </Text>

              <Text style={styles.editModalSubtitle}>
                {t(
                  "drivers.editDriverDescription",

                  "Update driver information",
                )}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              disabled={loading}
              style={styles.editModalClose}
            >
              <X size={17} color={COLORS.primary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* PROFILE PHOTO */}

            <View style={styles.editProfileSection}>
              <Pressable
                disabled={loading}
                onPress={onPickProfilePicture}
                style={styles.editProfilePictureButton}
              >
                <View style={styles.editProfilePicture}>
                  {profileUri ? (
                    <Image
                      source={{
                        uri: profileUri,
                      }}
                      style={styles.editProfileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <DriverVehicleIcon
                      vehicleType={vehicleType}
                      size={27}
                      color={COLORS.primary}
                    />
                  )}
                </View>

                <View style={styles.editCameraBadge}>
                  <Camera size={13} color={COLORS.white} />
                </View>
              </Pressable>

              <View style={styles.editProfileText}>
                <Text style={styles.editProfileTitle}>
                  {t("drivers.profilePicture", "Profile Picture")}
                </Text>

                <Text style={styles.editProfileSubtitle}>
                  {t(
                    "drivers.changeProfilePicture",

                    "Tap the image to choose a new photo",
                  )}
                </Text>
              </View>
            </View>

            {/* FULL NAME */}

            <EditField
              label={t("profile.name", "Full Name")}
              value={name}
              onChangeText={onNameChange}
              placeholder={t("drivers.namePlaceholder", "Driver name")}
            />

            {/* SHORT NAME */}

            <EditField
              label={t("drivers.shortName", "Short Name")}
              value={shortName}
              onChangeText={onShortNameChange}
              placeholder={t("drivers.shortNamePlaceholder", "Example: Ahmed")}
            />

            {/* VEHICLE */}

            <View style={styles.editField}>
              <Text style={styles.editFieldLabel}>
                {t("drivers.vehicleType", "Vehicle Type")}
              </Text>

              <View style={styles.vehicleOptions}>
                <VehicleOption
                  label={t("drivers.car", "Car")}
                  icon={Car}
                  selected={vehicleType === "car"}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange("car")}
                />

                <VehicleOption
                  label={t("drivers.bike", "Bike")}
                  icon={Bike}
                  selected={vehicleType === "bike"}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange("bike")}
                />

                <VehicleOption
                  label={t("drivers.walking", "Walking")}
                  icon={PersonStanding}
                  selected={vehicleType === null}
                  disabled={loading}
                  onPress={() => onVehicleTypeChange(null)}
                />
              </View>
            </View>

            <EditField
              label={t("profile.iqama", "Iqama ID")}
              value={iqamaId}
              onChangeText={onIqamaChange}
              placeholder={t("drivers.iqamaPlaceholder", "Iqama ID")}
              keyboardType="number-pad"
            />

            <EditField
              label={t("profile.phone", "Phone")}
              value={phone}
              onChangeText={onPhoneChange}
              placeholder={t("drivers.phonePlaceholder", "Phone number")}
              keyboardType="phone-pad"
            />

            <EditField
              label={t("profile.password", "New Password")}
              value={password}
              onChangeText={onPasswordChange}
              placeholder={t(
                "driver.passwordOptional",

                "Leave empty to keep current password",
              )}
              secureTextEntry
            />
          </ScrollView>

          <View style={styles.editModalActions}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={({ pressed }) => [
                styles.editCancelButton,

                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.editCancelText}>
                {t("common.cancel", "Cancel")}
              </Text>
            </Pressable>

            <Pressable
              onPress={onSave}
              disabled={loading}
              style={({ pressed }) => [
                styles.editSaveButton,

                pressed && styles.buttonPressed,

                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.editSaveText}>
                  {t("common.save", "Save")}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function VehicleOption({
  label,

  icon: Icon,

  selected,

  disabled,

  onPress,
}: {
  label: string;

  icon: typeof Car;

  selected: boolean;

  disabled: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.vehicleOption,

        selected && styles.vehicleOptionSelected,

        pressed && styles.buttonPressed,

        disabled && styles.buttonDisabled,
      ]}
    >
      <Icon size={17} color={selected ? COLORS.white : COLORS.primary} />

      <Text
        style={[
          styles.vehicleOptionText,

          selected && styles.vehicleOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DriverVehicleIcon({
  vehicleType,

  size = 20,

  color = COLORS.white,
}: {
  vehicleType?: VehicleType | null;

  size?: number;

  color?: string;
}) {
  if (vehicleType === "car") {
    return <Car size={size} color={color} strokeWidth={2.3} />;
  }

  if (vehicleType === "bike") {
    return <Bike size={size} color={color} strokeWidth={2.3} />;
  }

  return <PersonStanding size={size} color={color} strokeWidth={2.3} />;
}

function EditField({
  label,

  value,

  onChangeText,

  placeholder,

  keyboardType = "default",

  secureTextEntry = false,
}: {
  label: string;

  value: string;

  onChangeText: (value: string) => void;

  placeholder: string;

  keyboardType?: "default" | "number-pad" | "phone-pad";

  secureTextEntry?: boolean;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const shouldShowToggle = secureTextEntry;

  return (
    <View style={styles.editField}>
      <Text style={styles.editFieldLabel}>{label}</Text>

      <View style={styles.editInputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.muted}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry && !passwordVisible}
          autoCapitalize={secureTextEntry ? "none" : "sentences"}
          autoCorrect={false}
          style={[
            styles.editInput,

            shouldShowToggle && styles.editInputWithIcon,
          ]}
        />

        {shouldShowToggle && (
          <Pressable
            onPress={() => setPasswordVisible((current) => !current)}
            style={({ pressed }) => [
              styles.passwordEyeButton,

              pressed && styles.buttonPressed,
            ]}
          >
            {passwordVisible ? (
              <EyeOff size={18} color={COLORS.muted} />
            ) : (
              <Eye size={18} color={COLORS.muted} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PhoneRow({
  label,

  value,

  hasPhone,

  onCall,

  onWhatsApp,
}: {
  label: string;

  value: string;

  hasPhone: boolean;

  onCall: () => void;

  onWhatsApp: () => void;
}) {
  return (
    <View style={styles.phoneRow}>
      <View style={styles.phoneInfo}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue}>{value}</Text>
      </View>

      {hasPhone && (
        <View style={styles.phoneActions}>
          <Pressable
            onPress={onCall}
            style={({ pressed }) => [
              styles.contactButton,

              pressed && styles.contactButtonPressed,
            ]}
          >
            <Phone size={18} color={COLORS.primary} />
          </Pressable>

          <Pressable
            onPress={onWhatsApp}
            style={({ pressed }) => [
              styles.contactButton,

              pressed && styles.contactButtonPressed,
            ]}
          >
            <MessageCircle size={19} color={COLORS.secondary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// function MiniStat({ label, value }: { label: string; value: string }) {
//   return (
//     <View style={styles.miniStat}>
//       <Text style={styles.miniStatValue}>{value}</Text>

//       <Text style={styles.miniStatLabel}>{label}</Text>
//     </View>
//   );
// }

function normalizePhoneForCall(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function normalizePhoneForWhatsApp(phone: string) {
  let value = phone.replace(/\D/g, "");

  // Saudi local mobile:

  // 05XXXXXXXX -> 9665XXXXXXXX

  if (value.startsWith("05") && value.length === 10) {
    value = `966${value.slice(1)}`;
  }

  // 5XXXXXXXX -> 9665XXXXXXXX

  if (value.startsWith("5") && value.length === 9) {
    value = `966${value}`;
  }

  // 009665XXXXXXXX -> 9665XXXXXXXX

  if (value.startsWith("00")) {
    value = value.slice(2);
  }

  return value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 28,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    marginBottom: 7,
  },
  back: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  loading: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.primary,
    marginBottom: 7,
  },
  cardTitleNoMargin: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.primary,
  },

  // Driver information
  driverCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  driverIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  driverAvatar: {
    width: 50,
    height: 50,
    marginRight: 10,
    borderRadius: 25,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  driverAvatarImage: {
    width: "100%",
    height: "100%",
  },
  driverIdentityText: {
    flex: 1,
    minWidth: 0,
  },
  driverPrimaryName: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary,
  },
  driverFullName: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.muted,
  },
  supervisorModeText: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: COLORS.border,
  },
  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeBadge: {
    backgroundColor: COLORS.successBackground,
  },
  inactiveBadge: {
    backgroundColor: COLORS.errorBackground,
  },
  statusText: {
    fontSize: 8,
    fontWeight: "800",
  },
  activeText: {
    color: COLORS.success,
  },
  inactiveText: {
    color: COLORS.error,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 7,
  },
  infoRow: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.muted,
  },
  infoValue: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.black,
  },
  phoneRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  phoneInfo: {
    flex: 1,
  },
  phoneActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 8,
  },
  contactButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactButtonPressed: {
    opacity: 0.6,
  },
  driverActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 8,
  },
  editDriverButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editDriverButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary,
  },
  inlineStatusButton: {
    flex: 1.35,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
    borderRadius: 9,
  },
  inlineDeactivateButton: {
    backgroundColor: COLORS.error,
  },
  inlineActivateButton: {
    backgroundColor: COLORS.primary,
  },
  inlineStatusButtonText: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
  },

  // Order history
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyHeadingText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historySubtitle: {
    marginTop: 2,
    fontSize: 8,
    color: COLORS.primary,
  },
  historyFilterRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  historyFilterButton: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  historyFilterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  historyFilterText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
  },
  historyFilterTextActive: {
    color: COLORS.white,
  },
  calendarIconBox: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: COLORS.light,
  },
  calendarHelp: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 8,
    lineHeight: 12,
    color: COLORS.muted,
  },
  calendarWrapper: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.white,
  },
  calendarDay: {
    width: 39,
    minHeight: 48,
    paddingVertical: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: "#DDE9EA",
  },
  calendarDayEdge: {
    backgroundColor: COLORS.primary,
  },
  calendarDayAnchor: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  calendarDayNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.black,
  },
  calendarDayDisabledContainer: {
    opacity: 0.35,
  },
  calendarDayDisabled: {
    color: "#AEBABB",
  },
  calendarDayNumberSelected: {
    color: COLORS.white,
  },
  calendarCountBadge: {
    minWidth: 20,
    marginTop: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    backgroundColor: COLORS.light,
  },
  calendarCountBadgeHasOrders: {
    backgroundColor: "#E5F2F2",
  },
  calendarCountBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  calendarCountText: {
    fontSize: 7,
    fontWeight: "800",
    color: COLORS.muted,
  },
  calendarCountTextHasOrders: {
    color: COLORS.primary,
  },
  calendarCountTextSelected: {
    color: COLORS.white,
  },
  selectedRangeBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  selectedRangeLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  selectedRangeBoxInside: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectedRangeValue: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },
  rangePendingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: COLORS.warningBackground,
  },
  rangePendingText: {
    fontSize: 7,
    fontWeight: "800",
    color: COLORS.warning,
  },
  historyLoader: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  historyLoadingText: {
    marginTop: 7,
    fontSize: 9,
    color: COLORS.muted,
  },
  historyErrorBox: {
    marginTop: 10,
    padding: 9,
    borderRadius: 8,
    backgroundColor: COLORS.errorBackground,
  },
  historyRetryButton: {
    alignSelf: "flex-start",
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
  },
  historyRetryText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.white,
  },
  historyEmpty: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  historyEmptyTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.primary,
  },
  historyEmptyText: {
    maxWidth: 280,
    marginTop: 4,
    fontSize: 8,
    lineHeight: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
  historyList: {
    marginTop: 10,
    gap: 8,
  },
  historyCard: {
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: "#FCFDFD",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  historySummaryRow: {
    minHeight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historySummaryPressed: {
    opacity: 0.72,
  },
  historySummaryMain: {
    flex: 1,
    minWidth: 0,
  },
  historyExpandIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    backgroundColor: COLORS.light,
  },
  historyExpandedContent: {
    paddingTop: 4,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  historyOrderTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: COLORS.primary,
  },
  historyCreatedAt: {
    marginTop: 2,
    fontSize: 7,
    color: COLORS.muted,
  },
  historyStatus: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.light,
  },
  historyActive: {
    backgroundColor: COLORS.warningBackground,
  },
  historyDelivered: {
    backgroundColor: COLORS.successBackground,
  },
  historyCancelled: {
    backgroundColor: COLORS.errorBackground,
  },
  historyStatusText: {
    fontSize: 7,
    fontWeight: "800",
    color: COLORS.muted,
  },
  historyActiveText: {
    color: COLORS.warning,
  },
  historyDeliveredText: {
    color: COLORS.success,
  },
  historyCancelledText: {
    color: COLORS.error,
  },
  historyImages: {
    flexDirection: "row",
    gap: 8,
  },
  historyImageBox: {
    flex: 1,
  },
  historyImageLabel: {
    marginBottom: 4,
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.muted,
  },
  historyImage: {
    width: "100%",
    height: 110,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  historyImageEmpty: {
    width: "100%",
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  historyImageEmptyText: {
    color: COLORS.muted,
  },
  tapImageHint: {
    position: "absolute",
    right: 5,
    bottom: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: "rgba(10,9,12,0.65)",
  },
  tapImageHintText: {
    fontSize: 7,
    fontWeight: "700",
    color: COLORS.white,
  },
  evidenceTitle: {
    marginTop: 9,
    marginBottom: 5,
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.muted,
  },
  evidenceRow: {
    gap: 6,
  },
  evidenceImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: COLORS.light,
  },
  historyDetails: {
    marginTop: 8,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  historyDetailRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  historyDetailLabel: {
    fontSize: 8,
    color: COLORS.muted,
  },
  historyDetailValue: {
    flex: 1,
    fontSize: 8,
    fontWeight: "700",
    color: COLORS.black,
    textAlign: "right",
  },
  historyNotes: {
    marginTop: 6,
    padding: 7,
    borderRadius: 7,
    backgroundColor: COLORS.light,
    fontSize: 8,
    lineHeight: 12,
    color: COLORS.black,
  },
  pagination: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageButton: {
    minWidth: 84,
    height: 32,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  pageButtonDisabled: {
    opacity: 0.35,
  },
  pageButtonText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.white,
  },
  pageNumber: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.primary,
  },

  // Generic errors/buttons
  errorBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.errorBackground,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.error,
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.55,
  },

  // Image viewer
  imageModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.88)",
  },
  imageModalBackground: {
    ...StyleSheet.absoluteFill,
  },
  imageModalContent: {
    width: "94%",
    height: "78%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },

  // Existing edit modal
  editModalOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10, 9, 12, 0.5)",
  },
  editModalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  editModalTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary,
  },
  editModalSubtitle: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.muted,
  },
  editModalClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: COLORS.light,
  },
  editField: {
    marginBottom: 10,
  },
  editFieldLabel: {
    marginBottom: 5,
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.muted,
  },
  editInputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  editInput: {
    height: 42,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.light,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.black,
  },
  editInputWithIcon: {
    paddingRight: 44,
  },
  passwordEyeButton: {
    position: "absolute",
    right: 4,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  editModalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 5,
  },
  editCancelButton: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.light,
  },
  editCancelText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },
  editSaveButton: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: COLORS.primary,
  },
  editSaveText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.white,
  },
  editProfileSection: {
    minHeight: 74,
    marginBottom: 12,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    backgroundColor: COLORS.light,
  },
  editProfilePictureButton: {
    position: "relative",
    marginRight: 10,
  },
  editProfilePicture: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  editProfileImage: {
    width: "100%",
    height: "100%",
  },
  editCameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -1,
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.primary,
  },
  editProfileText: {
    flex: 1,
  },
  editProfileTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.primary,
  },
  editProfileSubtitle: {
    marginTop: 3,
    fontSize: 8,
    lineHeight: 12,
    color: COLORS.muted,
  },
  vehicleOptions: {
    flexDirection: "row",
    gap: 6,
  },
  vehicleOption: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
    backgroundColor: COLORS.light,
  },
  vehicleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  vehicleOptionText: {
    fontSize: 8,
    fontWeight: "800",
    color: COLORS.primary,
  },
  vehicleOptionTextSelected: {
    color: COLORS.white,
  },
});
