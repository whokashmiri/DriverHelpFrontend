import {
  useCallback,
  useEffect,
  useState,
} from "react";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";


import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  router,
} from "expo-router";

import {
  useTranslation,
} from "react-i18next";

import {
  X,
  CalendarDays
} from "lucide-react-native";

import {
  AppScreen,
} from "../../components/AppScreen";

import {
  getSupervisorActiveOrders,
  getSupervisorOrders,
} from "../../api/orderApi";

import {
  getMyDrivers,
} from "../../api/driverApi";

import {
  getErrorMessage,
} from "../../utils";

import type {
  Order,
  SupervisorOrderStatusFilter,
} from "../../types/order";

import type {
  Driver,
} from "../../api/driverApi";

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

type DateFilter =
  | "today"
  | "7days"
  | "30days"
  | "custom"
  | "all";

export default function SupervisorOrdersScreen() {
  const { t } =
    useTranslation();

  /*
   * Active orders
   */
  const [
    activeOrders,
    setActiveOrders,
  ] = useState<Order[]>([]);

  const [
    isLoadingActive,
    setIsLoadingActive,
  ] = useState(true);

  const [
    activeError,
    setActiveError,
  ] = useState<string | null>(
    null,
  );

  /*
   * History
   */
  const [
    historyOrders,
    setHistoryOrders,
  ] = useState<Order[]>([]);

  const [
    drivers,
    setDrivers,
  ] = useState<Driver[]>([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historyError,
    setHistoryError,
  ] = useState<string | null>(
    null,
  );

  /*
   * Pagination
   */
  const [page, setPage] =
    useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    totalOrders,
    setTotalOrders,
  ] = useState(0);

  /*
   * Filters
   */
  const [
    selectedDriverId,
    setSelectedDriverId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<SupervisorOrderStatusFilter>(
      "all",
    );

  const [
    dateFilter,
    setDateFilter,
  ] =
    useState<DateFilter>(
      "today",
    );


    const [
  customFromDate,
  setCustomFromDate,
] = useState<Date | null>(
  null,
);

const [
  customToDate,
  setCustomToDate,
] = useState<Date | null>(
  null,
);
  /*
   * Image preview modal
   */
  const [
    previewImage,
    setPreviewImage,
  ] =
    useState<string | null>(
      null,
    );

  /*
   * ACTIVE ORDERS
   */
  const loadActiveOrders =
    useCallback(async () => {
      try {
        setActiveError(null);

        const response =
          await getSupervisorActiveOrders();

        const active =
          (
            response.orders ??
            []
          ).filter(
            (order) =>
              order.status ===
              "picked_up",
          );

        setActiveOrders(
          active,
        );
      } catch (error) {
        setActiveError(
          getErrorMessage(
            error,
            t(
              "orders.loadFailed",
              "Unable to load active orders",
            ),
          ),
        );
      } finally {
        setIsLoadingActive(
          false,
        );
      }
    }, [t]);

  /*
   * DRIVERS
   */
  const loadDrivers =
    useCallback(async () => {
      try {
        const response =
          await getMyDrivers();

        setDrivers(
          response.drivers ??
            [],
        );
      } catch {
        /*
         * History can still
         * work without this.
         */
      }
    }, []);

  /*
   * HISTORY
   */
  const loadHistory =
    useCallback(async () => {
      try {
        setHistoryLoading(
          true,
        );

        setHistoryError(
          null,
        );

       const {
  from,
  to,
} =
  dateFilter === "custom"
    ? {
        from:
          customFromDate
            ? formatDateForApi(
                customFromDate,
              )
            : undefined,

        to:
          customToDate
            ? formatDateForApi(
                customToDate,
              )
            : undefined,
      }
    : getDateRange(
        dateFilter,
      );

        const response =
          await getSupervisorOrders({
            page,

            limit: 10,

            driverId:
              selectedDriverId ||
              undefined,

            status:
              statusFilter,

            from,

            to,
          });

        setHistoryOrders(
          response.orders ??
            [],
        );

        setTotalPages(
          response.pagination
            ?.totalPages ??
            1,
        );

        setTotalOrders(
          response.pagination
            ?.total ??
            0,
        );
      } catch (error) {
        setHistoryError(
          getErrorMessage(
            error,
            t(
              "orders.historyLoadFailed",
              "Unable to load order history",
            ),
          ),
        );
      } finally {
        setHistoryLoading(
          false,
        );
      }
    }, [
      page,
      selectedDriverId,
      statusFilter,
      dateFilter,
      customFromDate,
  customToDate,
      t,
    ]);

  useEffect(() => {
    void loadActiveOrders();

    void loadDrivers();
  }, [
    loadActiveOrders,
    loadDrivers,
  ]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <AppScreen>
      <ScrollView
        style={
          styles.screen
        }
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={
            styles.backButton
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ←{" "}
            {t(
              "common.back",
              "Back",
            )}
          </Text>
        </Pressable>

        {/* =========================
            ACTIVE ORDERS
        ========================== */}

        <View
          style={
            styles.heading
          }
        >
          <View
            style={
              styles.headingLeft
            }
          >
            <Text
              style={
                styles.title
              }
            >
              {t(
                "orders.activeOrders",
                "Active Orders",
              )}
            </Text>

            <Text
              style={
                styles.subtitle
              }
            >
              {t(
                "orders.supervisorSubtitle",
                "View active orders from your drivers",
              )}
            </Text>
          </View>

          {!isLoadingActive && (
            <View
              style={
                styles.countBadge
              }
            >
              <Text
                style={
                  styles.countValue
                }
              >
                {
                  activeOrders.length
                }
              </Text>

              <Text
                style={
                  styles.countLabel
                }
              >
                {t(
                  "orders.active",
                  "Active",
                )}
              </Text>
            </View>
          )}
        </View>

        {isLoadingActive ? (
          <View
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              color={
                COLORS.primary
              }
            />

            <Text
              style={
                styles.loadingText
              }
            >
              {t(
                "orders.loading",
                "Loading active orders...",
              )}
            </Text>
          </View>
        ) : activeError ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorText
              }
            >
              {activeError}
            </Text>

            <Pressable
              onPress={() => {
                setIsLoadingActive(
                  true,
                );

                void loadActiveOrders();
              }}
              style={({
                pressed,
              }) => [
                styles.retryButton,

                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.retryText
                }
              >
                {t(
                  "common.retry",
                  "Retry",
                )}
              </Text>
            </Pressable>
          </View>
        ) : activeOrders.length ===
          0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.iconCircle
              }
            >
              <Text
                style={
                  styles.iconText
                }
              >
                O
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {t(
                "orders.noActiveOrders",
                "No active orders",
              )}
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {t(
                "orders.noActiveOrdersDescription",
                "Your drivers currently have no active pickup orders.",
              )}
            </Text>
          </View>
        ) : (
          <View
            style={
              styles.list
            }
          >
            {activeOrders.map(
              (order) => {
                const rider =
                  typeof order.rider ===
                  "string"
                    ? null
                    : order.rider;

                return (
                  <View
                    key={
                      order._id
                    }
                    style={
                      styles.orderCard
                    }
                  >
                    <Pressable
                      onPress={() => {
                        if (
                          order
                            .pickupPhoto
                            ?.url
                        ) {
                          setPreviewImage(
                            order
                              .pickupPhoto
                              .url,
                          );
                        }
                      }}
                    >
                      {order
                        .pickupPhoto
                        ?.url ? (
                        <Image
                          source={{
                            uri:
                              order
                                .pickupPhoto
                                .url,
                          }}
                          style={
                            styles.orderImage
                          }
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={
                            styles.orderImagePlaceholder
                          }
                        >
                          <Text
                            style={
                              styles.orderImageText
                            }
                          >
                            O
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    <Pressable
                      style={
                        styles.orderInfo
                      }
                      onPress={() => {
                        if (
                          !rider?._id
                        ) {
                          return;
                        }

                        router.push({
                          pathname:
                            "/(supervisor)/driver-details",

                          params: {
                            driverId:
                              rider._id,
                          },
                        });
                      }}
                    >
                      <View
                        style={
                          styles.orderTopRow
                        }
                      >
                        <Text
                          style={
                            styles.driverName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {rider?.name ??
                            t(
                              "drivers.driver",
                              "Driver",
                            )}
                        </Text>

                        <View
                          style={
                            styles.activeBadge
                          }
                        >
                          <View
                            style={
                              styles.activeDot
                            }
                          />

                          <Text
                            style={
                              styles.activeText
                            }
                          >
                            {t(
                              "orders.active",
                              "Active",
                            )}
                          </Text>
                        </View>
                      </View>

                      {!!order.orderId && (
                        <Text
                          style={
                            styles.orderIdText
                          }
                        >
                          #
                          {
                            order.orderId
                          }
                        </Text>
                      )}

                      {!!rider?.iqamaId && (
                        <Text
                          style={
                            styles.driverSub
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {t(
                            "profile.iqama",
                            "Iqama",
                          )}
                          :{" "}
                          {
                            rider.iqamaId
                          }
                        </Text>
                      )}

                      <Text
                        style={
                          styles.pickupTime
                        }
                      >
                        {t(
                          "orders.pickupTime",
                          "Pickup",
                        )}
                        :{" "}
                        {formatOrderTime(
                          order.pickupTime,
                        )}
                      </Text>

                      {!!order.notes?.trim() && (
                        <Text
                          style={
                            styles.notes
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            order.notes
                          }
                        </Text>
                      )}
                    </Pressable>

                    <Text
                      style={
                        styles.chevron
                      }
                    >
                      ›
                    </Text>
                  </View>
                );
              },
            )}
          </View>
        )}

        {/* =========================
            ORDER HISTORY
        ========================== */}

        <View
          style={
            styles.historySection
          }
        >
          <View
            style={
              styles.historyHeading
            }
          >
            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.historyTitle
                }
              >
                {t(
                  "orders.history",
                  "Order History",
                )}
              </Text>

              <Text
                style={
                  styles.historySubtitle
                }
              >
                {totalOrders}{" "}
                {t(
                  "orders.orders",
                  "orders",
                )}
              </Text>
            </View>
          </View>

 <HistoryFilters
  drivers={
    drivers
  }
  selectedDriverId={
    selectedDriverId
  }
  statusFilter={
    statusFilter
  }
  dateFilter={
    dateFilter
  }
  customFromDate={
    customFromDate
  }
  customToDate={
    customToDate
  }
  onDriverChange={(
    value,
  ) => {
    setPage(1);

    setSelectedDriverId(
      value,
    );
  }}
  onStatusChange={(
    value,
  ) => {
    setPage(1);

    setStatusFilter(
      value,
    );
  }}
  onDateChange={(
    value,
  ) => {
    setPage(1);

    setDateFilter(
      value,
    );
  }}
  onCustomFromDateChange={(
    date,
  ) => {
    setPage(1);

    setCustomFromDate(
      date,
    );
  }}
  onCustomToDateChange={(
    date,
  ) => {
    setPage(1);

    setCustomToDate(
      date,
    );
  }}
/>
         

          {historyLoading ? (
            <View
              style={
                styles.historyLoader
              }
            >
              <ActivityIndicator
                color={
                  COLORS.primary
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                {t(
                  "orders.loadingHistory",
                  "Loading order history...",
                )}
              </Text>
            </View>
          ) : historyError ? (
            <View
              style={
                styles.errorBox
              }
            >
              <Text
                style={
                  styles.errorText
                }
              >
                {historyError}
              </Text>

              <Pressable
                onPress={() =>
                  void loadHistory()
                }
                style={
                  styles.retryButton
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  {t(
                    "common.retry",
                    "Retry",
                  )}
                </Text>
              </Pressable>
            </View>
          ) : historyOrders.length ===
            0 ? (
            <View
              style={
                styles.historyEmpty
              }
            >
              <Text
                style={
                  styles.emptyTitle
                }
              >
                {t(
                  "orders.noHistory",
                  "No orders found",
                )}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {t(
                  "orders.changeFilters",
                  "Try changing the selected filters.",
                )}
              </Text>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.historyList
                }
              >
                {historyOrders.map(
                  (order) => (
                    <SupervisorHistoryCard
                      key={
                        order._id
                      }
                      order={
                        order
                      }
                      onImagePress={
                        setPreviewImage
                      }
                    />
                  ),
                )}
              </View>

              <Pagination
                page={page}
                totalPages={
                  totalPages
                }
                onPrevious={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.max(
                        1,
                        current -
                          1,
                      ),
                  )
                }
                onNext={() =>
                  setPage(
                    (
                      current,
                    ) =>
                      Math.min(
                        totalPages,
                        current +
                          1,
                      ),
                  )
                }
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* IMAGE VIEWER */}

      <ImagePreviewModal
        uri={
          previewImage
        }
        onClose={() =>
          setPreviewImage(
            null,
          )
        }
      />
    </AppScreen>
  );
}

/*
 * =========================
 * HISTORY FILTERS
 * =========================
 */

function formatDisplayDate(
  date: Date,
) {
  return date.toLocaleDateString(
    [],
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function HistoryFilters({
  drivers,
  selectedDriverId,
  statusFilter,
  dateFilter,
  customFromDate,
  customToDate,
  onDriverChange,
  onStatusChange,
  onDateChange,
  onCustomFromDateChange,
  onCustomToDateChange,
}: {
  drivers: Driver[];

  selectedDriverId:
    | string
    | null;

  statusFilter:
    SupervisorOrderStatusFilter;

  dateFilter:
    DateFilter;

  customFromDate:
    Date | null;

  customToDate:
    Date | null;

  onDriverChange: (
    value:
      | string
      | null,
  ) => void;

  onStatusChange: (
    value:
      SupervisorOrderStatusFilter,
  ) => void;

  onDateChange: (
    value:
      DateFilter,
  ) => void;

  onCustomFromDateChange: (
    date: Date,
  ) => void;

  onCustomToDateChange: (
    date: Date,
  ) => void;
}) {
  const { t } =
    useTranslation();

  const [
    showFromPicker,
    setShowFromPicker,
  ] =
    useState(false);

  const [
    showToPicker,
    setShowToPicker,
  ] =
    useState(false);

  const handleFromChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowFromPicker(
      false,
    );

    if (
      event.type ===
        "dismissed" ||
      !selectedDate
    ) {
      return;
    }

    onCustomFromDateChange(
      selectedDate,
    );

    /*
     * If To is earlier than
     * the new From date,
     * move To to the same date.
     */
    if (
      customToDate &&
      selectedDate.getTime() >
        customToDate.getTime()
    ) {
      onCustomToDateChange(
        selectedDate,
      );
    }
  };

  const handleToChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    setShowToPicker(
      false,
    );

    if (
      event.type ===
        "dismissed" ||
      !selectedDate
    ) {
      return;
    }

    onCustomToDateChange(
      selectedDate,
    );
  };

  const openCustom =
    () => {
      onDateChange(
        "custom",
      );

      /*
       * Give the supervisor sensible
       * defaults the first time.
       */
      if (
        !customFromDate
      ) {
        const today =
          new Date();

        onCustomFromDateChange(
          today,
        );
      }

      if (
        !customToDate
      ) {
        const today =
          new Date();

        onCustomToDateChange(
          today,
        );
      }
    };

  return (
    <View
      style={
        styles.filtersCard
      }
    >
      {/* DRIVER */}

      <Text
        style={
          styles.filterLabel
        }
      >
        {t(
          "drivers.driver",
          "Driver",
        )}
      </Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filterRow
        }
      >
        <FilterChip
          label={t(
            "drivers.allDrivers",
            "All Drivers",
          )}
          active={
            !selectedDriverId
          }
          onPress={() =>
            onDriverChange(
              null,
            )
          }
        />

        {drivers.map(
          (driver) => {
            const id =
              driver._id ??
              driver.id;

            if (!id) {
              return null;
            }

            return (
              <FilterChip
                key={id}
                label={
                  driver.name
                }
                active={
                  selectedDriverId ===
                  id
                }
                onPress={() =>
                  onDriverChange(
                    id,
                  )
                }
              />
            );
          },
        )}
      </ScrollView>

      {/* STATUS */}

      <Text
        style={
          styles.filterLabel
        }
      >
        {t(
          "orders.status",
          "Status",
        )}
      </Text>

      <View
        style={
          styles.filterRowWrap
        }
      >
        <FilterChip
          label={t(
            "filters.all",
            "All",
          )}
          active={
            statusFilter ===
            "all"
          }
          onPress={() =>
            onStatusChange(
              "all",
            )
          }
        />

        <FilterChip
          label={t(
            "orders.active",
            "Active",
          )}
          active={
            statusFilter ===
            "picked_up"
          }
          onPress={() =>
            onStatusChange(
              "picked_up",
            )
          }
        />

        <FilterChip
          label={t(
            "orders.delivered",
            "Delivered",
          )}
          active={
            statusFilter ===
            "delivered"
          }
          onPress={() =>
            onStatusChange(
              "delivered",
            )
          }
        />

        <FilterChip
          label={t(
            "orders.cancelled",
            "Cancelled",
          )}
          active={
            statusFilter ===
            "cancelled"
          }
          onPress={() =>
            onStatusChange(
              "cancelled",
            )
          }
        />
      </View>

      {/* DATE */}

      <Text
        style={
          styles.filterLabel
        }
      >
        {t(
          "filters.date",
          "Date",
        )}
      </Text>

      <View
        style={
          styles.filterRowWrap
        }
      >
        <FilterChip
          label={t(
            "filters.today",
            "Today",
          )}
          active={
            dateFilter ===
            "today"
          }
          onPress={() =>
            onDateChange(
              "today",
            )
          }
        />

        <FilterChip
          label={t(
            "filters.sevenDays",
            "7 Days",
          )}
          active={
            dateFilter ===
            "7days"
          }
          onPress={() =>
            onDateChange(
              "7days",
            )
          }
        />

        <FilterChip
          label={t(
            "filters.thirtyDays",
            "30 Days",
          )}
          active={
            dateFilter ===
            "30days"
          }
          onPress={() =>
            onDateChange(
              "30days",
            )
          }
        />

        <Pressable
          onPress={
            openCustom
          }
          style={({
            pressed,
          }) => [
            styles.filterChip,

            styles.customDateChip,

            dateFilter ===
              "custom" &&
              styles.filterChipActive,

            pressed &&
              styles.buttonPressed,
          ]}
        >
          <CalendarDays
            size={13}
            color={
              dateFilter ===
              "custom"
                ? COLORS.white
                : COLORS.primary
            }
          />

          <Text
            style={[
              styles.filterChipText,

              dateFilter ===
                "custom" &&
                styles.filterChipTextActive,
            ]}
          >
            {t(
              "filters.custom",
              "Custom",
            )}
          </Text>
        </Pressable>

        <FilterChip
          label={t(
            "filters.all",
            "All",
          )}
          active={
            dateFilter ===
            "all"
          }
          onPress={() =>
            onDateChange(
              "all",
            )
          }
        />
      </View>

      {/* CUSTOM DATE RANGE */}

      {dateFilter ===
        "custom" && (
        <View
          style={
            styles.customDateSection
          }
        >
          <View
            style={
              styles.customDateRow
            }
          >
            <View
              style={
                styles.customDateField
              }
            >
              <Text
                style={
                  styles.customDateLabel
                }
              >
                {t(
                  "filters.from",
                  "From",
                )}
              </Text>

              <Pressable
                onPress={() =>
                  setShowFromPicker(
                    true,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.datePickerButton,

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <CalendarDays
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.datePickerText
                  }
                >
                  {customFromDate
                    ? formatDisplayDate(
                        customFromDate,
                      )
                    : t(
                        "filters.selectDate",
                        "Select date",
                      )}
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.customDateField
              }
            >
              <Text
                style={
                  styles.customDateLabel
                }
              >
                {t(
                  "filters.to",
                  "To",
                )}
              </Text>

              <Pressable
                onPress={() =>
                  setShowToPicker(
                    true,
                  )
                }
                style={({
                  pressed,
                }) => [
                  styles.datePickerButton,

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <CalendarDays
                  size={15}
                  color={
                    COLORS.primary
                  }
                />

                <Text
                  style={
                    styles.datePickerText
                  }
                >
                  {customToDate
                    ? formatDisplayDate(
                        customToDate,
                      )
                    : t(
                        "filters.selectDate",
                        "Select date",
                      )}
                </Text>
              </Pressable>
            </View>
          </View>

          {customFromDate &&
            customToDate && (
              <Text
                style={
                  styles.customDateSummary
                }
              >
                {formatDisplayDate(
                  customFromDate,
                )}
                {"  →  "}
                {formatDisplayDate(
                  customToDate,
                )}
              </Text>
            )}
        </View>
      )}

      {showFromPicker && (
        <DateTimePicker
          value={
            customFromDate ??
            new Date()
          }
          mode="date"
          display="default"
          maximumDate={
            customToDate ??
            new Date()
          }
          onChange={
            handleFromChange
          }
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={
            customToDate ??
            new Date()
          }
          mode="date"
          display="default"
          minimumDate={
            customFromDate ??
            undefined
          }
          maximumDate={
            new Date()
          }
          onChange={
            handleToChange
          }
        />
      )}
    </View>
  );
}



function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.filterChip,

        active &&
          styles.filterChipActive,

        pressed &&
          styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,

          active &&
            styles.filterChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================
 * HISTORY ORDER CARD
 * =========================
 */

function SupervisorHistoryCard({
  order,
  onImagePress,
}: {
  order: Order;

  onImagePress: (
    uri: string,
  ) => void;
}) {
  const { t } =
    useTranslation();

  const rider =
    typeof order.rider ===
    "string"
      ? null
      : order.rider;

  const delivered =
    order.status ===
    "delivered";

  const cancelled =
    order.status ===
    "cancelled";

  const active =
    order.status ===
    "picked_up";

  return (
    <View
      style={
        styles.historyCard
      }
    >
      <View
        style={
          styles.historyCardHeader
        }
      >
        <View
          style={{
            flex: 1,
          }}
        >
          <Text
            style={
              styles.historyOrderTitle
            }
          >
            {order.orderId
              ? `Order #${order.orderId}`
              : t(
                  "orders.order",
                  "Order",
                )}
          </Text>

          <Text
            style={
              styles.historyDriverName
            }
          >
            {rider?.name ??
              t(
                "drivers.driver",
                "Driver",
              )}
          </Text>

          {!!rider?.iqamaId && (
            <Text
              style={
                styles.historyIqama
              }
            >
              {t(
                "profile.iqama",
                "Iqama",
              )}
              :{" "}
              {
                rider.iqamaId
              }
            </Text>
          )}
        </View>

        <View
          style={[
            styles.historyStatus,

            active &&
              styles.historyActive,

            delivered &&
              styles.historyDelivered,

            cancelled &&
              styles.historyCancelled,
          ]}
        >
          <Text
            style={[
              styles.historyStatusText,

              cancelled &&
                styles.historyCancelledText,
            ]}
          >
            {active
              ? t(
                  "orders.active",
                  "Active",
                )
              : delivered
                ? t(
                    "orders.delivered",
                    "Delivered",
                  )
                : t(
                    "orders.cancelled",
                    "Cancelled",
                  )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.historyImages
        }
      >
        <HistoryImage
          label={t(
            "orders.pickup",
            "Pickup",
          )}
          uri={
            order.pickupPhoto
              ?.url
          }
          onPress={
            onImagePress
          }
        />

        {delivered && (
          <HistoryImage
            label={t(
              "orders.deliveryPhoto",
              "Delivery",
            )}
            uri={
              order.deliveryPhoto
                ?.url
            }
            onPress={
              onImagePress
            }
          />
        )}
      </View>

      {cancelled &&
        !!order
          .cancellationPhotos
          ?.length && (
          <>
            <Text
              style={
                styles.evidenceTitle
              }
            >
              {t(
                "orders.cancelPhotos",
                "Cancellation Evidence",
              )}
            </Text>

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.evidenceRow
              }
            >
              {order.cancellationPhotos.map(
                (
                  photo,
                  index,
                ) => (
                  <Pressable
                    key={`${photo.url}-${index}`}
                    onPress={() =>
                      onImagePress(
                        photo.url,
                      )
                    }
                  >
                    <Image
                      source={{
                        uri:
                          photo.url,
                      }}
                      style={
                        styles.evidenceImage
                      }
                      resizeMode="cover"
                    />
                  </Pressable>
                ),
              )}
            </ScrollView>
          </>
        )}

      <View
        style={
          styles.historyDetails
        }
      >
        <HistoryDetail
          label={t(
            "orders.pickupTime",
            "Pickup",
          )}
          value={formatOrderDateTime(
            order.pickupTime,
          )}
        />

        {delivered &&
          order.deliveryTime && (
            <HistoryDetail
              label={t(
                "orders.deliveryTime",
                "Delivery",
              )}
              value={formatOrderDateTime(
                order.deliveryTime,
              )}
            />
          )}

        {cancelled &&
          order.cancelledAt && (
            <HistoryDetail
              label={t(
                "orders.cancelledAt",
                "Cancelled",
              )}
              value={formatOrderDateTime(
                order.cancelledAt,
              )}
            />
          )}

        {cancelled &&
          !!order.cancellationReason && (
            <HistoryDetail
              label={t(
                "orders.cancelReason",
                "Reason",
              )}
              value={formatCancellationReason(
                order.cancellationReason,
              )}
            />
          )}

        {cancelled &&
          !!order.cancellationNotes && (
            <Text
              style={
                styles.historyNotes
              }
            >
              {
                order.cancellationNotes
              }
            </Text>
          )}

        {!!order.notes && (
          <Text
            style={
              styles.historyNotes
            }
          >
            {order.notes}
          </Text>
        )}
      </View>
    </View>
  );
}

function HistoryImage({
  label,
  uri,
  onPress,
}: {
  label: string;

  uri?:
    | string
    | null;

  onPress: (
    uri: string,
  ) => void;
}) {
  return (
    <View
      style={
        styles.historyImageBox
      }
    >
      <Text
        style={
          styles.historyImageLabel
        }
      >
        {label}
      </Text>

      {uri ? (
        <Pressable
          onPress={() =>
            onPress(uri)
          }
        >
          <Image
            source={{
              uri,
            }}
            style={
              styles.historyImage
            }
            resizeMode="cover"
          />

          <View
            style={
              styles.tapImageHint
            }
          >
            <Text
              style={
                styles.tapImageHintText
              }
            >
              View
            </Text>
          </View>
        </Pressable>
      ) : (
        <View
          style={
            styles.historyImageEmpty
          }
        >
          <Text
            style={
              styles.historyImageEmptyText
            }
          >
            -
          </Text>
        </View>
      )}
    </View>
  );
}

function HistoryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.historyDetailRow
      }
    >
      <Text
        style={
          styles.historyDetailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.historyDetailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================
 * IMAGE MODAL
 * =========================
 */

function ImagePreviewModal({
  uri,
  onClose,
}: {
  uri:
    | string
    | null;

  onClose: () => void;
}) {
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={
        onClose
      }
    >
      <View
        style={
          styles.imageModalOverlay
        }
      >
        <Pressable
          style={
            styles.imageModalBackground
          }
          onPress={
            onClose
          }
        />

        <View
          style={
            styles.imageModalContent
          }
        >
          <Pressable
            onPress={
              onClose
            }
            style={
              styles.imageModalClose
            }
          >
            <X
              size={24}
              color={
                COLORS.white
              }
            />
          </Pressable>

          {uri && (
            <Image
              source={{
                uri,
              }}
              style={
                styles.fullImage
              }
              resizeMode="contain"
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

/*
 * =========================
 * PAGINATION
 * =========================
 */

function Pagination({
  page,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number;

  totalPages: number;

  onPrevious:
    () => void;

  onNext:
    () => void;
}) {
  const { t } =
    useTranslation();

  if (
    totalPages <= 1
  ) {
    return null;
  }

  return (
    <View
      style={
        styles.pagination
      }
    >
      <Pressable
        disabled={
          page <= 1
        }
        onPress={
          onPrevious
        }
        style={[
          styles.pageButton,

          page <= 1 &&
            styles.pageButtonDisabled,
        ]}
      >
        <Text
          style={
            styles.pageButtonText
          }
        >
          {t(
            "common.previous",
            "Previous",
          )}
        </Text>
      </Pressable>

      <Text
        style={
          styles.pageNumber
        }
      >
        {page} /{" "}
        {totalPages}
      </Text>

      <Pressable
        disabled={
          page >=
          totalPages
        }
        onPress={
          onNext
        }
        style={[
          styles.pageButton,

          page >=
            totalPages &&
            styles.pageButtonDisabled,
        ]}
      >
        <Text
          style={
            styles.pageButtonText
          }
        >
          {t(
            "common.next",
            "Next",
          )}
        </Text>
      </Pressable>
    </View>
  );
}

/*
 * =========================
 * HELPERS
 * =========================
 */

function getDateRange(
  filter: DateFilter,
) {
  if (
    filter === "all" ||
    filter === "custom"
  ) {
    return {
      from: undefined,
      to: undefined,
    };
  }

  const now =
    new Date();

  const start =
    new Date(now);

  if (
    filter === "7days"
  ) {
    start.setDate(
      now.getDate() - 6,
    );
  }

  if (
    filter === "30days"
  ) {
    start.setDate(
      now.getDate() - 29,
    );
  }

  return {
    from:
      formatDateForApi(
        start,
      ),

    to:
      formatDateForApi(
        now,
      ),
  };
}

function formatDateForApi(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

function formatOrderTime(
  value?:
    | string
    | Date
    | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  );
}

function formatOrderDateTime(
  value?:
    | string
    | Date
    | null,
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return date.toLocaleString(
    [],
    {
      year:
        "numeric",

      month:
        "short",

      day:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    },
  );
}

function formatCancellationReason(
  value: string,
) {
  return value
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}

/*
 * =========================
 * STYLES
 * =========================
 */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,

      backgroundColor:
        COLORS.light,
    },

    content: {
      paddingHorizontal: 12,

      paddingTop: 8,

      paddingBottom: 30,
    },

    backButton: {
      alignSelf:
        "flex-start",

      paddingVertical: 3,

      marginBottom: 6,
    },

    backText: {
      fontSize: 12,

      fontWeight: "700",

      color:
        COLORS.secondary,
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

      color:
        COLORS.primary,
    },

    subtitle: {
      marginTop: 2,

      fontSize: 11,

      lineHeight: 15,

      color:
        COLORS.muted,
    },

    countBadge: {
      minWidth: 46,

      height: 38,

      marginLeft: 10,

      paddingHorizontal: 8,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 9,

      backgroundColor:
        COLORS.primary,
    },

    countValue: {
      fontSize: 13,

      fontWeight: "900",

      color:
        COLORS.white,
    },

    countLabel: {
      marginTop: -1,

      fontSize: 7,

      fontWeight: "700",

      color: "#D9E6E7",
    },

    loading: {
      minHeight: 120,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loadingText: {
      marginTop: 6,

      fontSize: 10,

      color:
        COLORS.muted,
    },

    errorBox: {
      padding: 10,

      borderRadius: 9,

      backgroundColor:
        COLORS.errorBackground,

      marginBottom: 8,
    },

    errorText: {
      fontSize: 10,

      lineHeight: 14,

      color:
        COLORS.error,
    },

    retryButton: {
      height: 32,

      marginTop: 8,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 8,

      backgroundColor:
        COLORS.primary,
    },

    retryText: {
      fontSize: 10,

      fontWeight: "800",

      color:
        COLORS.white,
    },

    emptyCard: {
      minHeight: 140,

      paddingHorizontal: 18,

      paddingVertical: 18,

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    iconCircle: {
      width: 40,

      height: 40,

      borderRadius: 20,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.light,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      marginBottom: 8,
    },

    iconText: {
      fontSize: 14,

      fontWeight: "900",

      color:
        COLORS.primary,
    },

    emptyTitle: {
      fontSize: 13,

      fontWeight: "800",

      color:
        COLORS.primary,

      textAlign:
        "center",
    },

    emptyText: {
      maxWidth: 280,

      marginTop: 4,

      fontSize: 10,

      lineHeight: 15,

      color:
        COLORS.muted,

      textAlign:
        "center",
    },

    list: {
      gap: 6,
    },

    orderCard: {
      minHeight: 72,

      flexDirection: "row",

      alignItems:
        "center",

      padding: 8,

      borderRadius: 10,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },

    orderImage: {
      width: 54,

      height: 54,

      borderRadius: 8,

      backgroundColor:
        COLORS.light,
    },

    orderImagePlaceholder: {
      width: 54,

      height: 54,

      borderRadius: 8,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        COLORS.light,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    orderImageText: {
      fontSize: 15,

      fontWeight: "900",

      color:
        COLORS.primary,
    },

    orderInfo: {
      flex: 1,

      minWidth: 0,

      marginLeft: 9,
    },

    orderTopRow: {
      flexDirection: "row",

      alignItems:
        "center",
    },

    driverName: {
      flex: 1,

      fontSize: 12,

      fontWeight: "800",

      color:
        COLORS.black,
    },

    orderIdText: {
      marginTop: 2,

      fontSize: 9,

      fontWeight: "800",

      color:
        COLORS.primary,
    },

    activeBadge: {
      marginLeft: 6,

      paddingHorizontal: 6,

      paddingVertical: 3,

      flexDirection: "row",

      alignItems:
        "center",

      borderRadius: 999,

      backgroundColor:
        COLORS.successBackground,
    },

    activeDot: {
      width: 5,

      height: 5,

      marginRight: 4,

      borderRadius: 3,

      backgroundColor:
        COLORS.success,
    },

    activeText: {
      fontSize: 7,

      fontWeight: "800",

      color:
        COLORS.success,
    },

    driverSub: {
      marginTop: 2,

      fontSize: 9,

      color:
        COLORS.secondary,
    },

    pickupTime: {
      marginTop: 2,

      fontSize: 8,

      fontWeight: "600",

      color:
        COLORS.muted,
    },

    notes: {
      marginTop: 3,

      fontSize: 8,

      lineHeight: 11,

      color:
        COLORS.black,
    },

    chevron: {
      marginLeft: 5,

      fontSize: 20,

      color:
        COLORS.muted,
    },

    /*
     * HISTORY
     */

    historySection: {
      marginTop: 22,
    },

    historyHeading: {
      flexDirection: "row",

      alignItems:
        "center",

      marginBottom: 8,
    },

    historyTitle: {
      fontSize: 18,

      fontWeight: "900",

      color:
        COLORS.primary,
    },

    historySubtitle: {
      marginTop: 2,

      fontSize: 9,

      color:
        COLORS.muted,
    },

    filtersCard: {
      padding: 10,

      marginBottom: 10,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },

    filterLabel: {
      marginBottom: 5,

      marginTop: 7,

      fontSize: 9,

      fontWeight: "800",

      color:
        COLORS.muted,
    },

    filterRow: {
      gap: 5,

      paddingRight: 10,
    },

    filterRowWrap: {
      flexDirection: "row",

      flexWrap: "wrap",

      gap: 5,
    },

    filterChip: {
      minHeight: 30,

      paddingHorizontal: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 999,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.light,
    },

    filterChipActive: {
      borderColor:
        COLORS.primary,

      backgroundColor:
        COLORS.primary,
    },

    filterChipText: {
      fontSize: 8,

      fontWeight: "700",

      color:
        COLORS.primary,
    },

    filterChipTextActive: {
      color:
        COLORS.white,
    },

    historyLoader: {
      minHeight: 100,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    historyEmpty: {
      padding: 20,

      alignItems:
        "center",

      borderRadius: 10,

      backgroundColor:
        COLORS.white,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    historyList: {
      gap: 9,
    },

    historyCard: {
      padding: 10,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 12,

      backgroundColor:
        COLORS.white,
    },

    historyCardHeader: {
      flexDirection: "row",

      alignItems:
        "flex-start",

      marginBottom: 8,
    },

    historyOrderTitle: {
      fontSize: 13,

      fontWeight: "900",

      color:
        COLORS.primary,
    },

    historyDriverName: {
      marginTop: 2,

      fontSize: 11,

      fontWeight: "800",

      color:
        COLORS.black,
    },

    historyIqama: {
      marginTop: 1,

      fontSize: 8,

      color:
        COLORS.muted,
    },

    historyStatus: {
      paddingHorizontal: 7,

      paddingVertical: 4,

      borderRadius: 999,
    },

    historyActive: {
      backgroundColor:
        COLORS.successBackground,
    },

    historyDelivered: {
      backgroundColor:
        COLORS.successBackground,
    },

    historyCancelled: {
      backgroundColor:
        COLORS.errorBackground,
    },

    historyStatusText: {
      fontSize: 7,

      fontWeight: "900",

      color:
        COLORS.success,
    },

    historyCancelledText: {
      color:
        COLORS.error,
    },

    historyImages: {
      flexDirection: "row",

      gap: 7,
    },

    historyImageBox: {
      flex: 1,
    },

    historyImageLabel: {
      marginBottom: 4,

      fontSize: 8,

      fontWeight: "700",

      color:
        COLORS.muted,
    },

    historyImage: {
      width: "100%",

      height: 125,

      borderRadius: 9,

      backgroundColor:
        COLORS.light,
    },

    historyImageEmpty: {
      height: 125,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 9,

      backgroundColor:
        COLORS.light,

      borderWidth: 1,

      borderColor:
        COLORS.border,
    },

    historyImageEmptyText: {
      fontSize: 15,

      color:
        COLORS.muted,
    },

    tapImageHint: {
      position:
        "absolute",

      right: 5,

      bottom: 5,

      paddingHorizontal: 7,

      paddingVertical: 3,

      borderRadius: 999,

      backgroundColor:
        "rgba(0,0,0,0.55)",
    },

    tapImageHintText: {
      fontSize: 7,

      fontWeight: "800",

      color:
        COLORS.white,
    },

    evidenceTitle: {
      marginTop: 10,

      marginBottom: 5,

      fontSize: 9,

      fontWeight: "800",

      color:
        COLORS.primary,
    },

    evidenceRow: {
      gap: 6,

      paddingRight: 8,
    },

    evidenceImage: {
      width: 80,

      height: 80,

      borderRadius: 8,

      backgroundColor:
        COLORS.light,
    },

    historyDetails: {
      marginTop: 9,

      paddingTop: 8,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        COLORS.border,
    },

    historyDetailRow: {
      flexDirection: "row",

      justifyContent:
        "space-between",

      gap: 8,

      marginBottom: 4,
    },

    historyDetailLabel: {
      fontSize: 8,

      color:
        COLORS.muted,
    },

    historyDetailValue: {
      flex: 1,

      textAlign:
        "right",

      fontSize: 8,

      fontWeight: "700",

      color:
        COLORS.black,
    },

    historyNotes: {
      marginTop: 5,

      padding: 7,

      borderRadius: 7,

      fontSize: 9,

      lineHeight: 13,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.light,
    },

    /*
     * PAGINATION
     */

    pagination: {
      flexDirection: "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginTop: 12,
    },

    pageButton: {
      minWidth: 85,

      height: 34,

      paddingHorizontal: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      borderRadius: 8,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.white,
    },

    pageButtonDisabled: {
      opacity: 0.35,
    },

    pageButtonText: {
      fontSize: 9,

      fontWeight: "800",

      color:
        COLORS.primary,
    },

    pageNumber: {
      fontSize: 10,

      fontWeight: "800",

      color:
        COLORS.primary,
    },

    /*
     * IMAGE MODAL
     */

    imageModalOverlay: {
      flex: 1,

      justifyContent:
        "center",

      backgroundColor:
        "rgba(0,0,0,0.94)",
    },

    imageModalBackground: {
      ...StyleSheet.absoluteFill,
    },

    imageModalContent: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      padding: 16,
    },

    imageModalClose: {
      position:
        "absolute",

      top: 48,

      right: 18,

      zIndex: 10,

      width: 42,

      height: 42,

      borderRadius: 21,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "rgba(255,255,255,0.18)",
    },

    fullImage: {
      width: "100%",

      height: "82%",
    },

    buttonPressed: {
      opacity: 0.7,
    },

    customDateChip: {
  flexDirection:
    "row",

  gap: 5,
},

customDateSection: {
  marginTop: 10,

  paddingTop: 10,

  borderTopWidth:
    StyleSheet.hairlineWidth,

  borderTopColor:
    COLORS.border,
},

customDateRow: {
  flexDirection:
    "row",

  gap: 7,
},

customDateField: {
  flex: 1,
},

customDateLabel: {
  marginBottom: 4,

  fontSize: 8,

  fontWeight: "800",

  color:
    COLORS.muted,
},

datePickerButton: {
  height: 38,

  flexDirection:
    "row",

  alignItems:
    "center",

  gap: 6,

  paddingHorizontal: 9,

  borderWidth: 1,

  borderColor:
    COLORS.border,

  borderRadius: 8,

  backgroundColor:
    COLORS.light,
},

datePickerText: {
  flex: 1,

  fontSize: 9,

  fontWeight: "700",

  color:
    COLORS.primary,
},

customDateSummary: {
  marginTop: 7,

  paddingVertical: 6,

  paddingHorizontal: 8,

  borderRadius: 7,

  fontSize: 8,

  fontWeight: "700",

  textAlign:
    "center",

  color:
    COLORS.secondary,

  backgroundColor:
    COLORS.light,
},
  });