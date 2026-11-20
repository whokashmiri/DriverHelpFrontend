//services/backgroundLocation.ts
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { API_BASE_URL, getToken } from "../api/client";

export const BACKGROUND_LOCATION_TASK =
  "TOSH_BACKGROUND_LOCATION_TASK";

/*
 * Same server as the rest of the app:
 * change SERVER_URL in api/client.ts only.
 */
const LOCATION_URL = `${API_BASE_URL}/locations/me`;

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

// True once this JS session started the service with current options.
let configuredThisSession = false;

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
  const responseText = await response.text();

  console.warn("[BackgroundLocation] HTTP error:", {
    status: response.status,
    message: responseText.slice(0, 500),
    recordedAt: new Date(
      location.timestamp,
    ).toISOString(),
  });

  // Invalid or stale location
  if (
    response.status === 400 ||
    response.status === 409 ||
    response.status === 422
  ) {
    pendingLocations.shift();
    continue;
  }

  // Authentication or permission failure
  if (
    response.status === 401 ||
    response.status === 403
  ) {
    pendingLocations.length = 0;
    break;
  }

  break;
}


    
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
 * SILENT PUSH: "location_request"
 *
 * The backend sends a data-only push when this driver's
 * location is stale during an active shift (e.g. Android
 * killed the tracking service). Expo wakes the app in the
 * background, we read GPS once and POST it.
 */
export const LOCATION_REQUEST_TASK =
  "TOSH_LOCATION_REQUEST_TASK";

function isLocationRequestPayload(data: unknown): boolean {
  try {
    return JSON.stringify(data ?? "").includes("location_request");
  } catch {
    return false;
  }
}

async function readFreshPosition():
  Promise<Location.LocationObject | null> {
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 15000),
      ),
    ]);
  } catch (error) {
    console.warn("[LocationRequest] Current GPS failed:", error);
  }

  return null;
}

export async function handleLocationRequest(): Promise<void> {
  if (trackingStopped) {
    return;
  }

  if (!(await hasAlwaysLocationPermission())) {
    return;
  }

  const location =
    (await readFreshPosition()) ??
    (await Location.getLastKnownPositionAsync({
      maxAge: 60000,
    }).catch(() => null));

  if (!location) {
    return;
  }

  enqueueLocations([location]);

  await sendPendingLocations();
}

TaskManager.defineTask(
  LOCATION_REQUEST_TASK,
  async ({ data, error }) => {
    if (error || !isLocationRequestPayload(data)) {
      return;
    }

    await handleLocationRequest();
  },
);

void Notifications.registerTaskAsync(LOCATION_REQUEST_TASK).catch(
  (error) => {
    console.warn(
      "[LocationRequest] Unable to register push task:",
      error,
    );
  },
);

/*
 * PERMISSION HELPERS
 *
 * On Android, request*PermissionsAsync() launches a
 * system activity even when the permission is already
 * granted. That pauses our activity, so AppState
 * reports "background" and then "active" again.
 *
 * Calling request on every foreground event therefore
 * creates an endless background/foreground loop.
 * Tracking code therefore only checks permissions.
 * Prompts come from requestAlwaysLocationPermission(),
 * which runs only after the driver accepts an alert.
 */
let permissionPromptDepth = 0;

export function isLocationPermissionPromptActive(): boolean {
  return permissionPromptDepth > 0;
}

async function withPermissionPrompt<T>(
  prompt: () => Promise<T>,
): Promise<T> {
  permissionPromptDepth += 1;

  try {
    return await prompt();
  } finally {
    permissionPromptDepth -= 1;
  }
}

export async function hasForegroundLocationPermission():
  Promise<boolean> {
  const current =
    await Location.getForegroundPermissionsAsync();

  return current.granted;
}

/*
 * True only for "Allow all the time".
 */
export async function hasAlwaysLocationPermission():
  Promise<boolean> {
  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);

  return foreground.granted && background.granted;
}

/*
 * False when Android will no longer show its prompt
 * and the driver must change the permission in Settings.
 */
export async function canRequestAlwaysLocationPermission():
  Promise<boolean> {
  const [foreground, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
  ]);

  return (
    (foreground.granted || foreground.canAskAgain) &&
    (background.granted || background.canAskAgain)
  );
}

/*
 * Android requires foreground access before background
 * access, so the two must be requested in this order.
 */
export async function requestAlwaysLocationPermission():
  Promise<boolean> {
  if (!(await hasForegroundLocationPermission())) {
    const foreground = await withPermissionPrompt(() =>
      Location.requestForegroundPermissionsAsync(),
    );

    if (!foreground.granted) {
      return false;
    }
  }

  const current =
    await Location.getBackgroundPermissionsAsync();

  if (current.granted) {
    return true;
  }

  const background = await withPermissionPrompt(() =>
    Location.requestBackgroundPermissionsAsync(),
  );

  return background.granted;
}

/*
 * START BACKGROUND TRACKING
 */
export async function startBackgroundLocationTracking():
  Promise<void> {
  const alreadyStarted =
    await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );

  if (alreadyStarted && configuredThisSession) {
    trackingStopped = false;
    return;
  }

  if (!(await hasAlwaysLocationPermission())) {
    throw new Error(
      "Allow all the time location permission is required",
    );
  }

  /*
   * A service started by an older app version (or before
   * a JS reload) may still use old options. Restart it once
   * per session so the current options apply. This only
   * runs from the foreground, where Android allows
   * starting a location foreground service.
   */
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
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

      /*
       * distanceInterval must be 0: with a distance
       * filter Android delivers nothing while the
       * driver is stationary (e.g. waiting at a
       * pickup), and the supervisor map goes stale.
       */
      timeInterval: 5000,
      distanceInterval: 0,

      activityType: Location.ActivityType.AutomotiveNavigation,

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
  configuredThisSession = true;

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
  configuredThisSession = false;

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
