
//(supervisor/live-map.tsx)
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getMyDrivers } from "../../api/driverApi";

import { router, useFocusEffect } from "expo-router";

import { useTranslation } from "react-i18next";

import { Camera, Map, Marker } from "@maplibre/maplibre-react-native";

import { Bike, Car, PersonStanding, Phone } from "lucide-react-native";

import { AppScreen } from "../../components/AppScreen";

import { getMyDriversLocations } from "../../api/locationApi";

import { connectSocket, onDriverLocationUpdate } from "../../socket/socket";

import { getActiveShift } from "../../api/shiftApi";
import { useAuth } from "../../hooks/useAuth";

import type {
  DriverLiveLocationUpdate,
  DriverLocation,
} from "../../types/location";

import { getErrorMessage } from "../../utils";

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

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const DEFAULT_CENTER: [number, number] = [46.6753, 24.7136];

const DEFAULT_ZOOM = 10;
const LOCATION_FRESH_MS = 2 * 60 * 1000;

function locationTime(value?: string | null): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function isLocationFresh(value: string | null | undefined, now: number) {
  const time = locationTime(value);
  return time !== null && time <= now + 30000 && now - time <= LOCATION_FRESH_MS;
}

function formatLocationAge(value: string | null | undefined, now: number) {
  const time = locationTime(value);
  if (time === null) return "Location time unavailable";
  const seconds = Math.max(0, Math.floor((now - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function LiveMapScreen() {
  const { t } = useTranslation();

  const cameraRef = useRef<any>(null);
  const hasInitialFitRef =
  useRef(false);

  const { user } = useAuth();

  const [locations, setLocations] = useState<DriverLocation[]>([]);

  /*
   * Socket is the source of truth
   * for the driver's current working
   * status once live updates arrive.
   */
  const [liveWorkingStatus, setLiveWorkingStatus] = useState<
    Record<string, boolean>
  >({});

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const loadRequestRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  /*
   * INITIAL LOCATION LOAD
   */
  const loadLocations = useCallback(async () => {
    const request = ++loadRequestRef.current;
    try {
      setError(null);

      const [locationResponse, driversResponse, activeShiftResponse] =
        await Promise.all([
          getMyDriversLocations(),
          getMyDrivers(),
          getActiveShift(),
        ]);

      if (request !== loadRequestRef.current) return;
      // Never replace a newer Socket.IO fix with an older REST response.
      setLocations((current) => {
        const byDriver = new globalThis.Map<string, DriverLocation>();
        for (const item of locationResponse?.locations ?? []) {
          const id = getDriverId(item);
          if (id) byDriver.set(id, item);
        }
        for (const item of current) {
          const id = getDriverId(item);
          if (!id) continue;
          const existing = byDriver.get(id);
          if (!existing || (locationTime(item.recordedAt) ?? 0) >
              (locationTime(existing.recordedAt) ?? 0)) {
            byDriver.set(id, item);
          }
        }
        return [...byDriver.values()];
      });

      const initialStatus: Record<string, boolean> = {};

      /*
       * Normal managed drivers.
       */
      for (const driver of driversResponse.drivers ?? []) {
        const id = driver._id ?? driver.id;

        if (!id) {
          continue;
        }

        initialStatus[id] = driver.workStatus === "working";
      }

      /*
       * Supervisor working as driver.
       */
      if (user?.role === "supervisor" && user.canDeliverOrders === true) {
        initialStatus[user.id] = Boolean(activeShiftResponse?.shift);
      }

      setLiveWorkingStatus((current) => ({ ...initialStatus, ...current }));
    } catch (err) {
      if (request !== loadRequestRef.current) return;
      setError(
        getErrorMessage(
          err,
          t("location.loadFailed", "Unable to load driver locations"),
        ),
      );
    } finally {
      if (request === loadRequestRef.current) setIsLoading(false);
    }
  }, [t, user?.id, user?.role, user?.canDeliverOrders]);

useFocusEffect(
  useCallback(() => {
    hasInitialFitRef.current = false;
    setMapReady(false);
    void loadLocations();

    return () => {
      hasInitialFitRef.current =
        false;
    };
  }, [loadLocations]),
);
  /*
   * Connect and subscribe only while the supervisor screen is focused.
   * HTTP background updates must be broadcast by the backend as
   * driver:location:update for them to appear instantly here.
   */
  useFocusEffect(
    useCallback(() => {
      let focused = true;
      const cleanup = onDriverLocationUpdate((update: DriverLiveLocationUpdate) => {
        if (!focused || !update.driverId) return;
        if (
          !Number.isFinite(update.latitude) ||
          !Number.isFinite(update.longitude) ||
          update.latitude < -90 || update.latitude > 90 ||
          update.longitude < -180 || update.longitude > 180
        ) return;

        setLocations((current) => {
          const index = current.findIndex(
            (item) => getDriverId(item) === update.driverId,
          );
          if (index === -1) {
            // Driver profile is not loaded yet; a refresh on focus will
            // bring newly assigned drivers into the list.
            return current;
          }

          const previous = current[index];
          const incomingTime = locationTime(update.recordedAt);
          const previousTime = locationTime(previous.recordedAt);
          if (incomingTime === null ||
              (previousTime !== null && incomingTime <= previousTime)) {
            return current;
          }

          const next = [...current];
          next[index] = {
            ...previous,
            latitude: update.latitude,
            longitude: update.longitude,
            accuracy: update.accuracy,
            speed: update.speed,
            heading: update.heading,
            recordedAt: update.recordedAt,
          };
          return next;
        });
        setLiveWorkingStatus((current) => ({
          ...current,
          [update.driverId]: update.isWorking,
        }));
      });

      void connectSocket().catch((err) => {
        if (focused) {
          console.warn("[LiveMap] Socket connection failed:", err);
          setError(getErrorMessage(err, "Live connection unavailable"));
        }
      });

      return () => {
        focused = false;
        cleanup();
        // Do not disconnect the shared socket: other screens may use it.
      };
    }, [loadLocations]),
  );

  /*
   * NORMALIZE GPS COORDINATES
   */
  const validLocations = useMemo(() => {
    return locations
      .map((item) => {
        const latitude = Number(item.latitude);

        const longitude = Number(item.longitude);

        return {
          ...item,

          latitude,
          longitude,
        };
      })
      .filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          item.latitude >= -90 &&
          item.latitude <= 90 &&
          item.longitude >= -180 &&
          item.longitude <= 180,
      );
  }, [locations]);

  /*
   * MAP INITIAL CENTER
   */
  const initialCenter = useMemo<[number, number]>(() => {
    if (validLocations.length === 0) {
      return DEFAULT_CENTER;
    }

    return [validLocations[0].longitude, validLocations[0].latitude];
  }, [validLocations]);

  /*
   * FIT ON INITIAL LOAD / DATA
   */


 const fitAllDrivers = useCallback(() => {
  if (!cameraRef.current || validLocations.length === 0) return;

  if (validLocations.length === 1) {
    const location = validLocations[0];
    cameraRef.current.easeTo?.({
      center: [location.longitude, location.latitude],
      zoom: 14,
      duration: 600,
    });
    return;
  }

  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity;
  for (const location of validLocations) {
    west = Math.min(west, location.longitude);
    east = Math.max(east, location.longitude);
    south = Math.min(south, location.latitude);
    north = Math.max(north, location.latitude);
  }

  // MapLibre CameraRef.fitBounds expects [west, south, east, north].
  cameraRef.current.fitBounds?.(
    [west, south, east, north],
    {
      padding: { top: 100, right: 110, bottom: 150, left: 110 },
      duration: 700,
    },
  );
 }, [validLocations]);

useEffect(() => {
  if (
    !mapReady ||
    validLocations.length === 0 ||
    hasInitialFitRef.current
  ) {
    return;
  }

  const timeout =
    setTimeout(() => {
      fitAllDrivers();

      hasInitialFitRef.current =
        true;
    }, 700);

  return () => {
    clearTimeout(timeout);
  };
}, [
  mapReady,
  validLocations.length,
  fitAllDrivers,
]);

  const selectedLocation = useMemo(() => {
    if (!selectedDriverId) {
      return null;
    }

    return (
      validLocations.find(
        (location) => getDriverId(location) === selectedDriverId,
      ) ?? null
    );
  }, [selectedDriverId, validLocations]);

  return (
    <AppScreen>
      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,

              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>
              {t("supervisor.liveMap", "Live Map")}
            </Text>

            <Text style={styles.subtitle}>
              {t("location.liveTracking", "Driver locations")}
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countValue}>{validLocations.length}</Text>

            <Text style={styles.countLabel}>
              {t("supervisor.drivers", "Drivers")}
            </Text>
          </View>
        </View>

        {isLoading && validLocations.length === 0 ? (
          <LoadingState />
        ) : error && validLocations.length === 0 ? (
          <ErrorState
            error={error}
            onRetry={() => {
              setIsLoading(true);

              void loadLocations();
            }}
          />
        ) : (
          <View style={styles.mapContainer}>
            <Map
              style={styles.map}
              mapStyle={MAP_STYLE_URL}
              onDidFinishLoadingMap={() => setMapReady(true)}
              onPress={() => setSelectedDriverId(null)}
            >
            <Camera
  ref={cameraRef}
  initialViewState={{
    center: initialCenter,
    zoom: DEFAULT_ZOOM,
  }}
  minZoom={2}
  maxZoom={19}
/>

              {validLocations.map((location) => {
                const driverId = getDriverId(location);

                if (!driverId) {
                  return null;
                }

                const driver = getDriver(location);

                const selected = selectedDriverId === driverId;
                const fresh = isLocationFresh(location.recordedAt, now);

                const isWorking = getDriverWorkingStatus(
                  driverId,
                  driver,
                  liveWorkingStatus,
                );

                return (
                  <Marker
                    key={driverId}
                    id={driverId}
                    lngLat={[location.longitude, location.latitude]}
                    anchor="bottom"
                    onPress={(event) => {
                      event.stopPropagation?.();

                      setSelectedDriverId(driverId);
                    }}
                  >
                    <View style={styles.markerWrapper}>
                      <View
                        style={[
                          styles.markerLabel,

                          selected && styles.markerLabelSelected,

                          (!isWorking || !fresh) && styles.markerLabelInactive,
                        ]}
                      >
                        {/* PHOTO / AVATAR */}

                        <DriverAvatar
                          profilePictureUrl={driver?.profilePicture?.url}
                          size={34}
                          isWorking={isWorking && fresh}
                        />

                        {/* NAME + PHONE */}

                        <View style={styles.markerDriverInfo}>
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.markerDriverName,

                              (!isWorking || !fresh) && styles.inactiveMainText,
                            ]}
                          >
                            {getDriverDisplayName(
                              driver,
                              t("drivers.driver", "Driver"),
                            )}
                          </Text>

                          <View style={styles.phoneVehicleContainer}>
                            <View style={styles.phoneRow}>
                              <Phone
                                size={8}
                                color="#111"
                                style={styles.phoneIcon}
                              />

                              <Text
                                numberOfLines={1}
                                style={styles.markerDriverPhone}
                              >
                                {driver?.phone ?? "-"}
                              </Text>
                            </View>

                          
                          </View>

                            <VehicleBadge
                              vehicleType={driver?.vehicleType}
                              isWorking={isWorking}
                              compact
                            />
                        </View>
                      </View>

                      <View
                        style={[
                          styles.markerPointer,

                          selected && styles.markerPointerSelected,

                          !isWorking && styles.markerPointerInactive,
                        ]}
                      />
                    </View>
                  </Marker>
                );
              })}
            </Map>

            {/* LIVE BADGE */}

            <View pointerEvents="none" style={styles.liveBadge}>
              <View style={styles.liveDot} />

              <Text style={styles.liveText}>
                {validLocations.length} {t("location.onMap", "on map")}
              </Text>
            </View>

            {/* SHOW ALL */}

            {validLocations.length > 0 && (
            <Pressable
  onPress={() =>
    fitAllDrivers()
  }
  style={({ pressed }) => [
    styles.fitButton,

    pressed &&
      styles.buttonPressed,
  ]}
>
  <Text
    style={
      styles.fitButtonText
    }
  >
    {t(
      "location.showAll",
      "Show All",
    )}
  </Text>
</Pressable>
            )}

            {!!error && validLocations.length > 0 && (
              <Pressable
                onPress={() => void loadLocations()}
                style={styles.warningBadge}
              >
                <Text numberOfLines={1} style={styles.warningText}>
                  {t("location.refreshFailed", "Refresh failed — tap to retry")}
                </Text>
              </Pressable>
            )}

            {validLocations.length === 0 && (
              <View pointerEvents="none" style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>
                  {t("location.noDriverLocations", "No driver locations")}
                </Text>

                <Text style={styles.emptyText}>
                  {t(
                    "location.waitingForLocations",
                    "Driver locations will appear here when location tracking starts.",
                  )}
                </Text>
              </View>
            )}

            {/* SELECTED DRIVER */}

            {selectedLocation && (
              <DriverLocationCard
                location={selectedLocation}
                isWorking={getDriverWorkingStatus(
                  getDriverId(selectedLocation),
                  getDriver(selectedLocation),
                  liveWorkingStatus,
                )}
                now={now}
                onClose={() => setSelectedDriverId(null)}
              />
            )}

            <View pointerEvents="none" style={styles.attribution}>
              <Text style={styles.attributionText}>
                © OpenStreetMap contributors
              </Text>
            </View>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

/*
 * SELECTED DRIVER CARD
 */
function DriverLocationCard({
  location,
  isWorking,
  now,
  onClose,
}: {
  location: DriverLocation;

  isWorking: boolean;
  now: number;

  onClose: () => void;
}) {
  const { t } = useTranslation();

  const driver = getDriver(location);

  const driverId = getDriverId(location);
  const fresh = isLocationFresh(location.recordedAt, now);

  return (
    <View style={styles.driverCard}>
      <View style={styles.driverCardTop}>
        <DriverAvatar
          profilePictureUrl={driver?.profilePicture?.url}
          size={40}
          isWorking={isWorking && fresh}
        />

        <View style={styles.driverInfo}>
          {/* SHORT NAME */}

          <Text
            numberOfLines={1}
            style={[styles.driverName, !isWorking && styles.inactiveMainText]}
          >
            {getDriverDisplayName(driver, t("drivers.driver", "Driver"))}
          </Text>

          {/* FULL NAME */}

          {!!driver?.shortName && !!driver?.name && (
            <Text numberOfLines={1} style={styles.driverFullName}>
              {driver.name}
            </Text>
          )}

          {/* PHONE */}

          <Text numberOfLines={1} style={styles.driverSub}>
            {driver?.phone ?? "-"}
          </Text>

          {/* VEHICLE */}

          <VehicleBadge
            vehicleType={driver?.vehicleType}
            isWorking={isWorking && fresh}
          />
        </View>

        <View
          style={[
            styles.workingBadge,

            isWorking && fresh ? styles.workingBadgeActive : styles.workingBadgeInactive,
          ]}
        >
          <View
            style={[
              styles.workingDot,

              isWorking && fresh ? styles.workingDotActive : styles.workingDotInactive,
            ]}
          />

          <Text
            style={[
              styles.workingText,

              isWorking && fresh ? styles.workingTextActive : styles.workingTextInactive,
            ]}
          >
            {isWorking
              ? t("drivers.working", "Working")
              : t("drivers.notWorking", "Offline")}
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <Text style={[styles.locationAge, !fresh && styles.locationAgeStale]}>
        {fresh ? "Live GPS" : "Stale GPS"} · {formatLocationAge(location.recordedAt, now)}
      </Text>

      <View style={styles.locationRow}>
        <View style={styles.locationMetric}>
          <Text style={styles.metricLabel}>
            {t("location.latitude", "Latitude")}
          </Text>

          <Text style={styles.metricValue}>
            {Number(location.latitude).toFixed(5)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.locationMetric}>
          <Text style={styles.metricLabel}>
            {t("location.longitude", "Longitude")}
          </Text>

          <Text style={styles.metricValue}>
            {Number(location.longitude).toFixed(5)}
          </Text>
        </View>
      </View>

      {!!driverId && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(supervisor)/driver-details",

              params: {
                driverId,
              },
            })
          }
          style={({ pressed }) => [
            styles.viewDriverButton,

            pressed && styles.viewDriverButtonPressed,
          ]}
        >
          <Text style={styles.viewDriverText}>
            {t("drivers.viewDriver", "View Driver")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/*
 * DRIVER AVATAR
 */
function DriverAvatar({
  profilePictureUrl,
  size,
  isWorking,
}: {
  profilePictureUrl?: string | null;

  size: number;

  isWorking: boolean;
}) {
  if (profilePictureUrl) {
    return (
      <View
        style={[
          styles.avatarContainer,
          {
            width: size,
            height: size,

            // borderRadius: size / 2,
          },

          !isWorking && styles.avatarInactive,
        ]}
      >
        <Image
          source={{
            uri: profilePictureUrl,
          }}
          style={styles.avatarImage}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatarContainer,

        styles.avatarFallback,

        {
          width: size,
          height: size,

          borderRadius: 3,
        },

        !isWorking && styles.avatarFallbackInactive,
      ]}
    >
      <PersonStanding
        size={size * 0.5}
        color={isWorking ? COLORS.white : COLORS.white}
        strokeWidth={2.3}
      />
    </View>
  );
}

/*
 * VEHICLE BADGE
 */
function VehicleBadge({
  vehicleType,
  isWorking,
  compact = false,
}: {
  vehicleType?: string | null;

  isWorking: boolean;

  compact?: boolean;
}) {
  const { t } = useTranslation();

  const iconColor = isWorking ? COLORS.secondary : COLORS.muted;

  const label =
    vehicleType === "car"
      ? t("drivers.car", "Car")
      : vehicleType === "bike"
        ? t("drivers.bike", "Bike")
        : t("drivers.walking", "Walking");

  return (
    <View
      style={[
        styles.vehicleBadge,

        compact && styles.vehicleBadgeCompact,

        !isWorking && styles.vehicleBadgeInactive,
      ]}
    >
      <DriverVehicleIcon
        vehicleType={vehicleType}
        size={compact ? 10 : 12}
        color={iconColor}
      />

      <Text
        style={[
          styles.vehicleBadgeText,

          !isWorking && styles.vehicleBadgeTextInactive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function DriverVehicleIcon({
  vehicleType,
  size = 17,
  color = COLORS.secondary,
}: {
  vehicleType?: string | null;

  size?: number;

  color?: string;
}) {
  if (vehicleType === "bike") {
    return <Bike size={size} color={color} strokeWidth={2.4} />;
  }

  if (vehicleType === "car") {
    return <Car size={size} color={color} strokeWidth={2.4} />;
  }

  return <PersonStanding size={size} color={color} strokeWidth={2.4} />;
}

function getDriverWorkingStatus(
  driverId: string | null,
  driver: any,
  liveWorkingStatus: Record<string, boolean>,
) {
  if (
    driverId &&
    Object.prototype.hasOwnProperty.call(liveWorkingStatus, driverId)
  ) {
    return liveWorkingStatus[driverId];
  }

  /*
   * Additional fallback if the
   * location API ever includes it.
   */
  if (driver?.workStatus === "working") {
    return true;
  }

  if (typeof driver?.isWorking === "boolean") {
    return driver.isWorking;
  }

  return false;
}
function getDriverDisplayName(driver: any, fallback: string) {
  return driver?.shortName?.trim() || driver?.name?.trim() || fallback;
}

function getDriverId(location: DriverLocation) {
  if (typeof location.driver === "string") {
    return location.driver;
  }

  return (
    location.driver?._id ??
    // location.driver?.id ??
    null
  );
}

function getDriver(location: DriverLocation) {
  if (typeof location.driver === "string") {
    return null;
  }

  return location.driver;
}

/*
 * LOADING
 */
function LoadingState() {
  const { t } = useTranslation();

  return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.primary} />

      <Text style={styles.stateText}>
        {t("location.loading", "Loading locations...")}
      </Text>
    </View>
  );
}

/*
 * ERROR
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string;

  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.center}>
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>
          {t("location.unavailable", "Location unavailable")}
        </Text>

        <Text style={styles.errorText}>{error}</Text>

        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,

            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.retryText}>{t("common.retry", "Retry")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: COLORS.light,
  },

  /*
   * HEADER
   */
  topBar: {
    minHeight: 58,

    paddingHorizontal: 12,
    paddingVertical: 8,

    flexDirection: "row",
    alignItems: "center",

    backgroundColor: COLORS.white,

    borderBottomWidth: StyleSheet.hairlineWidth,

    borderBottomColor: COLORS.border,

    zIndex: 10,
  },

  backButton: {
    width: 34,
    height: 34,

    marginRight: 8,

    borderRadius: 9,

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: COLORS.light,
  },

  backText: {
    fontSize: 18,

    fontWeight: "700",

    color: COLORS.primary,
  },

  headerInfo: {
    flex: 1,
  },

  title: {
    fontSize: 14,

    fontWeight: "800",

    color: COLORS.primary,
  },

  subtitle: {
    marginTop: 1,

    fontSize: 9,

    color: COLORS.muted,
  },

  countBadge: {
    minWidth: 54,

    height: 34,

    paddingHorizontal: 8,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.light,
  },

  countValue: {
    fontSize: 11,

    fontWeight: "900",

    color: COLORS.primary,
  },

  countLabel: {
    marginTop: -1,

    fontSize: 6,

    fontWeight: "700",

    color: COLORS.muted,
  },

  /*
   * MAP
   */
  mapContainer: {
    flex: 1,

    overflow: "hidden",

    backgroundColor: COLORS.light,
  },

  map: {
    ...StyleSheet.absoluteFill,

    backgroundColor: COLORS.light,
  },

  /*
   * TOP MAP CONTROLS
   */
  liveBadge: {
    position: "absolute",

    top: 10,
    left: 10,

    height: 29,

    paddingHorizontal: 9,

    flexDirection: "row",

    alignItems: "center",

    borderRadius: 9,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: "rgba(255,255,255,0.95)",
  },

  liveDot: {
    width: 7,

    height: 7,

    marginRight: 5,

    borderRadius: 4,

    backgroundColor: COLORS.success,
  },

  liveText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.primary,
  },

  fitButton: {
    position: "absolute",

    top: 10,
    right: 10,

    height: 29,

    paddingHorizontal: 11,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 9,

    backgroundColor: COLORS.primary,
  },

  fitButtonText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.white,
  },

  /*
   * MARKER
   */
  markerWrapper: {
    alignItems: "center",
  },

  markerLabel: {
    minWidth: 132,
    // maxWidth: 185,   <-- REMOVE this line
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    elevation: 5,
  },

  markerLabelSelected: {
    borderColor: COLORS.primary,

    transform: [
      {
        scale: 1.04,
      },
    ],
  },

  markerLabelInactive: {
    borderColor: COLORS.border,

    opacity: 0.88,
  },

  markerDriverInfo: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    marginLeft: 6,
  },
  markerDriverName: {
    fontSize: 9,

    fontWeight: "900",

    color: COLORS.primary,
  },

  markerPointer: {
    width: 0,

    height: 0,

    marginTop: -1,

    borderLeftWidth: 5,

    borderRightWidth: 5,

    borderTopWidth: 7,

    borderLeftColor: "transparent",

    borderRightColor: "transparent",

    borderTopColor: COLORS.white,
  },

  markerPointerSelected: {
    borderTopColor: COLORS.primary,
  },

  markerPointerInactive: {
    borderTopColor: COLORS.border,
  },

  /*
   * AVATAR
   */
  avatarContainer: {
    flexShrink: 0,

    overflow: "hidden",

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 2,

    borderColor: COLORS.success,

    backgroundColor: COLORS.primary,
  },

  avatarImage: {
    width: "100%",

    height: "100%",
  },

  avatarFallback: {
    backgroundColor: COLORS.primary,
  },

  avatarInactive: {
    borderColor: COLORS.muted,

    opacity: 0.62,
  },

  avatarFallbackInactive: {
    borderColor: COLORS.muted,

    backgroundColor: COLORS.muted,
  },

  /*
   * VEHICLE
   */
  vehicleBadge: {
    alignSelf: "flex-start",

    marginTop: 3,

    minHeight: 20,

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    paddingHorizontal: 7,

    paddingVertical: 3,

    borderRadius: 999,

    backgroundColor: COLORS.successBackground,
  },

  vehicleBadgeCompact: {
    minHeight: 17,

    marginTop: 2,

    paddingHorizontal: 5,

    paddingVertical: 2,
  },

  vehicleBadgeInactive: {
    backgroundColor: "#ECEFEF",
  },

  vehicleBadgeText: {
    fontSize: 7,

    fontWeight: "800",

    color: COLORS.secondary,
  },

  vehicleBadgeTextInactive: {
    color: COLORS.muted,
  },

  /*
   * DRIVER CARD
   */
  driverCard: {
    position: "absolute",

    left: 10,

    right: 10,

    bottom: 30,

    padding: 5,

    borderRadius: 13,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: COLORS.white,

    elevation: 6,
  },

  driverCardTop: {
    flexDirection: "row",

    alignItems: "center",
  },

  driverInfo: {
    flex: 1,

    minWidth: 0,

    marginLeft: 8,
  },

  driverName: {
    fontSize: 12,

    fontWeight: "900",

    color: COLORS.primary,
  },

  inactiveMainText: {
    color: COLORS.muted,
  },

  driverFullName: {
    marginTop: 1,

    fontSize: 8,

    color: COLORS.secondary,
  },

  driverSub: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  /*
   * WORKING BADGE
   */
  workingBadge: {
    marginLeft: 6,

    flexDirection: "row",

    alignItems: "center",

    gap: 3,

    paddingHorizontal: 6,

    paddingVertical: 4,

    borderRadius: 999,
  },

  workingBadgeActive: {
    backgroundColor: COLORS.successBackground,
  },

  workingBadgeInactive: {
    backgroundColor: "#ECEFEF",
  },

  workingDot: {
    width: 5,

    height: 5,

    borderRadius: 3,
  },

  workingDotActive: {
    backgroundColor: COLORS.success,
  },

  workingDotInactive: {
    backgroundColor: COLORS.muted,
  },

  workingText: {
    fontSize: 6,

    fontWeight: "900",
  },

  workingTextActive: {
    color: COLORS.success,
  },

  workingTextInactive: {
    color: COLORS.muted,
  },

  closeButton: {
    width: 27,

    height: 27,

    marginLeft: 5,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  closeText: {
    fontSize: 17,

    color: COLORS.muted,
  },

  /*
   * GPS CARD DETAILS
   */
  locationAge: {
    marginTop: 7,
    fontSize: 10,
    color: COLORS.success,
    fontWeight: "700",
  },
  locationAgeStale: {
    color: COLORS.error,
  },
  locationRow: {
    minHeight: 43,

    marginTop: 8,

    flexDirection: "row",

    alignItems: "center",

    borderRadius: 9,

    backgroundColor: COLORS.light,
  },

  locationMetric: {
    flex: 1,

    alignItems: "center",

    paddingVertical: 6,
  },

  metricDivider: {
    width: StyleSheet.hairlineWidth,

    height: 25,

    backgroundColor: COLORS.border,
  },

  metricLabel: {
    fontSize: 7,

    color: COLORS.muted,
  },

  metricValue: {
    marginTop: 2,

    fontSize: 9,

    fontWeight: "800",

    color: COLORS.primary,
  },

  viewDriverButton: {
    height: 32,

    marginTop: 7,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.primary,
  },

  viewDriverButtonPressed: {
    backgroundColor: COLORS.secondary,
  },

  viewDriverText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.white,
  },

  /*
   * WARNING / EMPTY
   */
  warningBadge: {
    position: "absolute",

    left: 10,

    right: 10,

    bottom: 30,

    minHeight: 30,

    paddingHorizontal: 10,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.errorBackground,
  },

  warningText: {
    fontSize: 8,

    fontWeight: "700",

    color: COLORS.error,
  },

  emptyCard: {
    position: "absolute",

    left: 24,

    right: 24,

    top: "38%",

    padding: 16,

    alignItems: "center",

    borderRadius: 13,

    borderWidth: 1,

    borderColor: COLORS.border,

    backgroundColor: "rgba(255,255,255,0.96)",
  },

  emptyTitle: {
    fontSize: 11,

    fontWeight: "800",

    color: COLORS.primary,
  },

  emptyText: {
    marginTop: 4,

    maxWidth: 260,

    fontSize: 8,

    lineHeight: 13,

    textAlign: "center",

    color: COLORS.muted,
  },

  attribution: {
    position: "absolute",

    right: 5,

    bottom: 4,

    paddingHorizontal: 5,

    paddingVertical: 2,

    borderRadius: 3,

    backgroundColor: "rgba(255,255,255,0.88)",
  },

  attributionText: {
    fontSize: 7,

    color: COLORS.muted,
  },

  /*
   * STATES
   */
  center: {
    flex: 1,

    paddingHorizontal: 20,

    alignItems: "center",

    justifyContent: "center",
  },

  stateText: {
    marginTop: 7,

    fontSize: 9,

    color: COLORS.muted,
  },

  errorCard: {
    width: "100%",

    padding: 14,

    alignItems: "center",

    borderRadius: 12,

    backgroundColor: COLORS.errorBackground,
  },

  errorTitle: {
    fontSize: 11,

    fontWeight: "800",

    color: COLORS.error,
  },

  errorText: {
    marginTop: 4,

    fontSize: 8,

    lineHeight: 13,

    textAlign: "center",

    color: COLORS.error,
  },

  retryButton: {
    height: 30,

    minWidth: 80,

    marginTop: 9,

    paddingHorizontal: 12,

    alignItems: "center",

    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.primary,
  },

  retryText: {
    fontSize: 8,

    fontWeight: "800",

    color: COLORS.white,
  },

  buttonPressed: {
    opacity: 0.65,
  },
  phoneVehicleContainer: {
    flexDirection: "row", // ⭐ phone + vehicle in same row
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    gap: 10, // RN 0.71+ supports gap
  },

  phoneRow: {
    flexDirection: "row", // ⭐ icon + phone text in same row
    alignItems: "center",
    gap: 3,
  },

  phoneIcon: {
    marginRight: 2, // extra spacing if gap not supported
  },

  markerDriverPhone: {
    marginTop: 1,

    fontSize: 7,

    color: COLORS.muted,
  },
});
