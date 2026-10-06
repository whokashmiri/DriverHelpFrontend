import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { getToken } from "../api/client";

export const BACKGROUND_LOCATION_TASK = "TOSH_BACKGROUND_LOCATION_TASK";

/*
 * Use your API URL here.
 *
 * Production:
 */
// const API_URL =
//   "https://driverhelp.167.71.231.64.nip.io/api";

/*
 * Local development:
 */
const API_URL = "http://192.168.0.138:9000/api";

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[];
};

/*
 * IMPORTANT:
 *
 * TaskManager.defineTask MUST exist
 * at module/global scope.
 *
 * Do NOT put this inside:
 * - React component
 * - hook
 * - useEffect
 * - callback
 */
TaskManager.defineTask(
  BACKGROUND_LOCATION_TASK,
  async ({
    data,
    error,
  }: TaskManager.TaskManagerTaskBody<BackgroundLocationTaskData>) => {
    if (error) {
      console.warn("[BackgroundLocation] Task error:", error.message);

      return;
    }

    if (!data?.locations?.length) {
      return;
    }

    /*
     * Expo may deliver more than one
     * location in a batch.
     *
     * Send the newest one.
     */
    const location = data.locations[data.locations.length - 1];

    const token = await getToken();

    if (!token) {
      console.warn("[BackgroundLocation] No auth token");

      return;
    }

    try {
      const response = await fetch(`${API_URL}/locations/me`, {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          latitude: location.coords.latitude,

          longitude: location.coords.longitude,

          accuracy: location.coords.accuracy ?? null,

          speed: location.coords.speed ?? null,

          heading: location.coords.heading ?? null,
        }),
      });

      if (!response.ok) {
        const text = await response.text();

        console.warn(
          "[BackgroundLocation] Server rejected location:",
          response.status,
          text,
        );

        return;
      }

      console.log("[BackgroundLocation] Sent:", {
        latitude: location.coords.latitude,

        longitude: location.coords.longitude,

        recordedAt: new Date(location.timestamp).toISOString(),
      });
    } catch (err) {
      console.warn("[BackgroundLocation] Network error:", err);
    }
  },
);

export async function startBackgroundLocationTracking() {
  /*
   * Do not register twice.
   */
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (alreadyStarted) {
    return;
  }

  /*
   * Foreground permission is required
   * before background permission.
   */
  const foregroundPermission =
    await Location.requestForegroundPermissionsAsync();

  if (foregroundPermission.status !== "granted") {
    throw new Error("Foreground location permission is required");
  }

  const backgroundPermission =
    await Location.requestBackgroundPermissionsAsync();

  if (backgroundPermission.status !== "granted") {
    throw new Error("Background location permission is required");
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,

    /*
     * Near-live background tracking.
     *
     * Android may still throttle
     * depending on device/vendor.
     */
    timeInterval: 5000,

    distanceInterval: 5,

    /*
     * Prevent batching for too long.
     */
    deferredUpdatesInterval: 0,

    deferredUpdatesDistance: 0,

    /*
     * Android foreground service.
     *
     * This produces the persistent
     * Android notification.
     */
    foregroundService: {
      notificationTitle: "TOSH Driver Tracking",

      notificationBody:
        "Your live location is being shared while your shift is active.",

      notificationColor: "#07393C",

      killServiceOnDestroy: false,
    },

    /*
     * iOS
     */
    pausesUpdatesAutomatically: false,

    showsBackgroundLocationIndicator: true,
  });

  console.log("[BackgroundLocation] Started");
}

export async function stopBackgroundLocationTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (!started) {
    return;
  }

  await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

  console.log("[BackgroundLocation] Stopped");
}

export async function isBackgroundLocationTracking() {
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
