import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Camera, Map, Marker } from "@maplibre/maplibre-react-native";

import { AppScreen } from "../../components/AppScreen";

import { getMyDriversLocations } from "../../api/locationApi";

import { onDriverLocationUpdate } from "../../socket/socket";

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

/*
 * MapLibre's public demo style.
 *
 * No Google Maps API key is required.
 *
 * Suitable for development/testing.
 * For production, use your own hosted tiles/style
 * or a dedicated tile provider.
 */
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const DEFAULT_CENTER: [number, number] = [
  46.6753, // longitude
  24.7136, // latitude
];

const DEFAULT_ZOOM = 10;

export default function LiveMapScreen() {
  const { t } = useTranslation();

  /*
   * MapLibre Camera ref.
   *
   * Using any here avoids version-specific
   * CameraRef type differences.
   */
  const cameraRef = useRef<any>(null);

  const [locations, setLocations] = useState<DriverLocation[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  /*
   * Prevent fitting before the map
   * has actually finished loading.
   */
  const [mapReady, setMapReady] = useState(false);

  const loadLocations = useCallback(async () => {
    try {
      setError(null);

      const response = await getMyDriversLocations();

      setLocations(response?.locations ?? []);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          t("location.loadFailed", "Unable to load driver locations"),
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  /*
   * Initial API load.
   */
  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  /*
   * Live socket updates.
   */
  useEffect(() => {
    const cleanup = onDriverLocationUpdate(
      (update: DriverLiveLocationUpdate) => {
        setLocations((current) => {
          const index = current.findIndex((item) => {
            const driverId = getDriverId(item);

            return driverId === update.driverId;
          });

          /*
           * Driver was not in the current API result.
           *
           * Refresh silently so the complete driver
           * object can be retrieved.
           */
          if (index === -1) {
            void loadLocations();

            return current;
          }

          const next = [...current];

          next[index] = {
            ...next[index],

            latitude: update.latitude,
            longitude: update.longitude,

            accuracy: update.accuracy,
            speed: update.speed,
            heading: update.heading,

            recordedAt: update.recordedAt,
          };

          return next;
        });
      },
    );

    return cleanup;
  }, [loadLocations]);

  /*
   * Normalize coordinates.
   *
   * This is important because API/DB values
   * may arrive as strings.
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
      .filter((item) => {
        return (
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude) &&
          item.latitude >= -90 &&
          item.latitude <= 90 &&
          item.longitude >= -180 &&
          item.longitude <= 180
        );
      });
  }, [locations]);

  /*
   * Initial map position.
   *
   * MapLibre coordinates are always:
   *
   * [longitude, latitude]
   *
   * NOT:
   *
   * [latitude, longitude]
   */
  const initialCenter = useMemo<[number, number]>(() => {
    if (validLocations.length === 0) {
      return DEFAULT_CENTER;
    }

    return [validLocations[0].longitude, validLocations[0].latitude];
  }, [validLocations]);

  /*
   * Fit drivers whenever location data changes.
   */
  useEffect(() => {
    if (!mapReady || validLocations.length === 0) {
      return;
    }

    const timeout = setTimeout(() => {
      fitAllDrivers();
    }, 300);

    return () => clearTimeout(timeout);
  }, [mapReady, validLocations]);

  const fitAllDrivers = useCallback(() => {
    if (!cameraRef.current || validLocations.length === 0) {
      return;
    }

    /*
     * One driver.
     */
    if (validLocations.length === 1) {
      const location = validLocations[0];

      cameraRef.current.easeTo?.({
        center: [location.longitude, location.latitude],

        zoom: 15,

        duration: 500,
      });

      return;
    }

    /*
     * Multiple drivers.
     *
     * Calculate geographic bounds.
     */
    let west = validLocations[0].longitude;
    let east = validLocations[0].longitude;

    let south = validLocations[0].latitude;
    let north = validLocations[0].latitude;

    for (const location of validLocations) {
      west = Math.min(west, location.longitude);
      east = Math.max(east, location.longitude);

      south = Math.min(south, location.latitude);
      north = Math.max(north, location.latitude);
    }

    /*
     * MapLibre fitBounds format:
     *
     * [west, south, east, north]
     */
    cameraRef.current.fitBounds?.(
      [west, south, east, north],
      {
        top: 70,
        right: 45,
        bottom: 120,
        left: 45,
      },
      600,
    );
  }, [validLocations]);

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
        {/*
         * HEADER
         */}
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
              onDidFinishLoadingMap={() => {
                setMapReady(true);
              }}
              onPress={() => {
                setSelectedDriverId(null);
              }}
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

              {/*
               * DRIVER MARKERS
               */}
              {validLocations.map((location) => {
                const driverId = getDriverId(location);

                if (!driverId) {
                  return null;
                }

                const driver = getDriver(location);

                const selected = selectedDriverId === driverId;

                return (
                  <Marker
                    key={driverId}
                    id={driverId}
                    lngLat={[location.longitude, location.latitude]}
                    anchor="bottom"
                    onPress={(event) => {
                      /*
                       * Prevent map press from immediately
                       * clearing the selected marker.
                       */
                      event.stopPropagation?.();

                      setSelectedDriverId(driverId);
                    }}
                  >
                    <View style={styles.markerWrapper}>
                      <View
                        style={[
                          styles.markerLabel,
                          selected && styles.markerLabelSelected,
                        ]}
                      >
                        <View
                          style={[
                            styles.marker,
                            selected && styles.markerSelected,
                          ]}
                        >
                          <Text style={styles.markerText}>
                            {getDriverInitial(driver?.name)}
                          </Text>
                        </View>

                        <View style={styles.markerDriverInfo}>
                          <Text
                            numberOfLines={1}
                            style={styles.markerDriverName}
                          >
                            {driver?.name ?? t("drivers.driver", "Driver")}
                          </Text>

                          <Text
                            numberOfLines={1}
                            style={styles.markerDriverIqama}
                          >
                            {driver?.iqamaId ?? "-"}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[
                          styles.markerPointer,
                          selected && styles.markerPointerSelected,
                        ]}
                      />
                    </View>
                  </Marker>
                );
              })}
            </Map>

            {/*
             * LIVE STATUS
             */}
            <View pointerEvents="none" style={styles.liveBadge}>
              <View style={styles.liveDot} />

              <Text style={styles.liveText}>
                {validLocations.length} {t("location.onMap", "on map")}
              </Text>
            </View>

            {/*
             * SHOW ALL DRIVERS
             */}
            {validLocations.length > 0 && (
              <Pressable
                onPress={fitAllDrivers}
                style={({ pressed }) => [
                  styles.fitButton,

                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.fitButtonText}>
                  {t("location.showAll", "Show All")}
                </Text>
              </Pressable>
            )}

            {/*
             * API failed but old data exists.
             */}
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

            {/*
             * NO GPS LOCATIONS
             */}
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

            {/*
             * SELECTED DRIVER CARD
             */}
            {selectedLocation && (
              <DriverLocationCard
                location={selectedLocation}
                onClose={() => setSelectedDriverId(null)}
              />
            )}

            {/*
             * Attribution.
             *
             * The demo MapLibre style also
             * contains OpenStreetMap data.
             */}
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

function DriverLocationCard({
  location,
  onClose,
}: {
  location: DriverLocation;

  onClose: () => void;
}) {
  const { t } = useTranslation();

  const driver = getDriver(location);

  const driverId = getDriverId(location);

  return (
    <View style={styles.driverCard}>
      <View style={styles.driverCardTop}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverAvatarText}>
            {getDriverInitial(driver?.name)}
          </Text>
        </View>

        <View style={styles.driverInfo}>
          <Text numberOfLines={1} style={styles.driverName}>
            {driver?.name ?? t("drivers.driver", "Driver")}
          </Text>

          <Text numberOfLines={1} style={styles.driverSub}>
            {driver?.iqamaId ?? "-"}
          </Text>
        </View>

        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

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

function getDriverId(location: DriverLocation) {
  if (typeof location.driver === "string") {
    return location.driver;
  }

  return location.driver?._id ?? null;
}

function getDriver(location: DriverLocation) {
  if (typeof location.driver === "string") {
    return null;
  }

  return location.driver;
}

function getDriverInitial(name?: string | null) {
  const clean = name?.trim();

  return clean ? clean.charAt(0).toUpperCase() : "D";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: COLORS.light,
  },

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

  mapContainer: {
    flex: 1,

    overflow: "hidden",

    backgroundColor: COLORS.light,
  },

  map: {
    ...StyleSheet.absoluteFill,

    backgroundColor: COLORS.light,
  },

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

  markerWrapper: {
    alignItems: "center",
  },

  markerLabel: {
    minWidth: 118,
    maxWidth: 165,

    minHeight: 42,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 5,
    paddingVertical: 4,

    borderRadius: 10,

    borderWidth: 2,
    borderColor: COLORS.white,

    backgroundColor: COLORS.white,

    elevation: 5,
  },

  markerLabelSelected: {
    borderColor: COLORS.primary,

    transform: [
      {
        scale: 1.05,
      },
    ],
  },

  marker: {
    width: 32,
    height: 32,

    flexShrink: 0,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.secondary,
  },

  markerSelected: {
    backgroundColor: COLORS.primary,
  },

  markerText: {
    fontSize: 10,
    fontWeight: "900",

    color: COLORS.white,
  },

  markerDriverInfo: {
    flex: 1,

    minWidth: 0,

    marginLeft: 6,
  },

  markerDriverName: {
    fontSize: 8,
    fontWeight: "900",

    color: COLORS.primary,
  },

  markerDriverIqama: {
    marginTop: 1,

    fontSize: 7,

    color: COLORS.muted,
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

  driverCard: {
    position: "absolute",

    left: 10,
    right: 10,
    bottom: 30,

    padding: 10,

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

  driverAvatar: {
    width: 34,
    height: 34,

    marginRight: 8,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",

    backgroundColor: COLORS.primary,
  },

  driverAvatarText: {
    fontSize: 11,
    fontWeight: "900",

    color: COLORS.white,
  },

  driverInfo: {
    flex: 1,

    minWidth: 0,
  },

  driverName: {
    fontSize: 11,
    fontWeight: "800",

    color: COLORS.primary,
  },

  driverSub: {
    marginTop: 2,

    fontSize: 8,

    color: COLORS.muted,
  },

  closeButton: {
    width: 28,
    height: 28,

    alignItems: "center",
    justifyContent: "center",

    borderRadius: 8,

    backgroundColor: COLORS.light,
  },

  closeText: {
    fontSize: 17,

    color: COLORS.muted,
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
});
