
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { getToken } from "../api/client";

export const BACKGROUND_LOCATION_TASK =
  "TOSH_BACKGROUND_LOCATION_TASK";

// Production
const API_URL =
  "https://driverhelp.167.71.231.64.nip.io/api";

// Local development:
// const API_URL = "http://192.168.0.138:9000/api";

const LOCATION_URL = `${API_URL}/locations/me`;

const REQUEST_TIMEOUT_MS = 12000;
const MAX_PENDING_LOCATIONS = 100;
const MAX_BATCH_LOCATIONS = 40;
const MAX_PENDING_AGE_MS = 2 * 60 * 1000;

type BackgroundLocationTaskData = {
  locations: Location.LocationObject[];
};

type PendingLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
};

/*
 * Temporary in-memory queue.
 *
 * The queue is not persisted and will be lost
 * if Android terminates the JS process.
 */
const pendingLocations: PendingLocation[] = [];

let deliveryPromise: Promise<void> | null = null;
let trackingStopped = false;

/*
 * Validate GPS coordinates and timestamp.
 */
function validLocation(
  location: Location.LocationObject,
): boolean {
  const { latitude, longitude } = location.coords;

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    Number.isFinite(location.timestamp)
  );
}

/*
 * Normalize optional GPS measurements.
 */
function optionalNumber(
  value: number | null | undefined,
  min: number,
  max = Infinity,
): number | null {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    return null;
  }

  return value;
}

/*
 * Add valid GPS points to the temporary queue.
 */
function enqueueLocations(
  locations: Location.LocationObject[],
): void {
  const ordered = locations
    .filter(validLocation)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_BATCH_LOCATIONS);

  for (const location of ordered) {
    /*
     * Ignore points already queued.
     */
    const exists = pendingLocations.some(
      (item) => item.timestamp === location.timestamp,
    );

    if (exists) {
      continue;
    }

    pendingLocations.push({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,

      accuracy: optionalNumber(
        location.coords.accuracy,
        0,
      ),

      speed: optionalNumber(
        location.coords.speed,
        0,
      ),

      heading: optionalNumber(
        location.coords.heading,
        0,
        360,
      ),

      /*
       * Preserve the real GPS acquisition time.
       */
      timestamp: location.timestamp,
    });
  }

  pendingLocations.sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  if (pendingLocations.length > MAX_PENDING_LOCATIONS) {
    pendingLocations.splice(
      0,
      pendingLocations.length - MAX_PENDING_LOCATIONS,
    );
  }
}

/*
 * Send queued locations through REST.
 *
 * This method is shared by foreground-service
 * background task invocations.
 */
async function sendPendingLocations(): Promise<void> {
  if (deliveryPromise) {
    return deliveryPromise;
  }

  const currentDelivery = (async () => {
    if (trackingStopped) {
      return;
    }

    const token = await getToken();

    if (!token) {
      console.warn(
        "[BackgroundLocation] Missing authentication token",
      );
      return;
    }

    while (
      pendingLocations.length > 0 &&
      !trackingStopped
    ) {
      const location = pendingLocations[0];

      /*
       * Do not send old points as live positions.
       */
      const age = Date.now() - location.timestamp;

      if (age > MAX_PENDING_AGE_MS) {
        pendingLocations.shift();
        continue;
      }

      /*
       * Ignore obviously future-dated samples.
       */
      if (age < -30000) {
        pendingLocations.shift();
        continue;
      }

      const controller = new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(LOCATION_URL, {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          signal: controller.signal,

          body: JSON.stringify({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,

            /*
             * REQUIRED:
             * Original GPS acquisition timestamp.
             */
            recordedAt: new Date(
              location.timestamp,
            ).toISOString(),
          }),
        });

        if (!response.ok) {
          console.warn(
            "[BackgroundLocation] Server status:",
            response.status,
          );

          /*
           * Invalid / stale location:
           * Remove only this rejected point.
           */
          if (
            response.status === 400 ||
            response.status === 409 ||
            response.status === 422
          ) {
            pendingLocations.shift();
            continue;
          }

          /*
           * Authentication or shift permission failure.
           *
           * Stop retrying this queue.
           * A new shift/task invocation can enqueue
           * fresh GPS positions.
           */
          if (
            response.status === 401 ||
            response.status === 403
          ) {
            pendingLocations.length = 0;
            break;
          }

          /*
           * Temporary server failure.
           * Retain the queue for the next task invocation.
           */
          break;
        }

        /*
         * Successful request.
         *
         * The backend may report accepted:false
         * for a duplicate/stale coordinate.
         * Both cases are terminal for this point.
         */
        const result = await response.json().catch(
          () => null,
        );

        if (
          result &&
          result.success === false
        ) {
          pendingLocations.shift();
          continue;
        }

        pendingLocations.shift();

        console.log(
          "[BackgroundLocation] Delivered",
          {
            accepted: result?.accepted ?? true,
            recordedAt: new Date(
              location.timestamp,
            ).toISOString(),
          },
        );
      } catch (error) {
        console.warn(
          "[BackgroundLocation] Delivery deferred:",
          error,
        );

        /*
         * Network error.
         * Retry on a later native task invocation.
         */
        break;
      } finally {
        clearTimeout(timeout);
      }
    }
  })();

  deliveryPromise = currentDelivery;

  try {
    await currentDelivery;
  } finally {
    if (deliveryPromise === currentDelivery) {
      deliveryPromise = null;
    }
  }
}

/*
 * Must remain at module scope.
 *
 * This allows Expo to execute the task
 * when the React screen is not mounted.
 */
TaskManager.defineTask<BackgroundLocationTaskData>(
  BACKGROUND_LOCATION_TASK,

  async ({ data, error }) => {
    if (error) {
      console.warn(
        "[BackgroundLocation] Native task error:",
        error.message,
      );
      return;
    }

    if (
      trackingStopped ||
      !data?.locations?.length
    ) {
      return;
    }

    enqueueLocations(data.locations);

    await sendPendingLocations();
  },
);

/*
 * START BACKGROUND TRACKING
 */
export async function startBackgroundLocationTracking():
  Promise<void> {
  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );

  if (alreadyStarted) {
    trackingStopped = false;
    return;
  }

  const foregroundPermission =
    await Location.requestForegroundPermissionsAsync();

  if (!foregroundPermission.granted) {
    throw new Error(
      "Foreground location permission is required",
    );
  }

  const backgroundPermission =
    await Location.requestBackgroundPermissionsAsync();

  if (!backgroundPermission.granted) {
    throw new Error(
      "Background location permission is required",
    );
  }

  /*
   * Do not retain locations from a previous shift.
   */
  pendingLocations.length = 0;

  await Location.startLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
    {
      accuracy: Location.Accuracy.High,

      timeInterval: 5000,
      distanceInterval: 5,

      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,

      foregroundService: {
        notificationTitle:
          "Spark Go Driver Tracking",

        notificationBody:
          "Your live location is being shared while your shift is active.",

        notificationColor: "#07393C",

        killServiceOnDestroy: false,
      },

      pausesUpdatesAutomatically: false,

      showsBackgroundLocationIndicator: true,
    },
  );

  trackingStopped = false;

  console.log(
    "[BackgroundLocation] Tracking started",
  );
}

/*
 * STOP BACKGROUND TRACKING
 *
 * Called after the backend confirms
 * the driver's shift ended.
 */
export async function stopBackgroundLocationTracking():
  Promise<void> {
  trackingStopped = true;

  /*
   * Do not replay old shift locations.
   */
  pendingLocations.length = 0;

  const started =
    await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );

  if (started) {
    await Location.stopLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );

    console.log(
      "[BackgroundLocation] Tracking stopped",
    );
  }
}

/*
 * CHECK NATIVE TRACKING STATUS
 */
export async function isBackgroundLocationTracking():
  Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(
    BACKGROUND_LOCATION_TASK,
  );
}
