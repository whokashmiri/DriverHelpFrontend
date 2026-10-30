
import { useCallback, useEffect, useRef, useState } from "react";

import { AppState } from "react-native";
import * as Location from "expo-location";

import {
  connectSocket,
  emitDriverLocation,
  isSocketConnected,
} from "../socket/socket";

import {
  isBackgroundLocationTracking,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "../services/backgroundLocation";

import { getErrorMessage } from "../utils";

type UseLocationTrackingOptions = {
  enabled: boolean;

  /*
   * False while the active shift is loading
   * or its status cannot be verified.
   */
  ready?: boolean;

  intervalMs?: number;
  distanceInterval?: number;
};

type BackgroundTrackingStatus =
  | "idle"
  | "starting"
  | "active"
  | "unavailable";

/*
 * Serialize native background start/stop requests.
 *
 * This prevents an async start and an async stop
 * from executing simultaneously.
 */
let backgroundOperationQueue: Promise<void> = Promise.resolve();

function queueBackgroundOperation(
  operation: () => Promise<void>,
): Promise<void> {
  const result = backgroundOperationQueue
    .catch(() => undefined)
    .then(operation);

  backgroundOperationQueue = result.catch(() => undefined);

  return result;
}

export function useLocationTracking({
  enabled,
  ready = true,
  intervalMs = 3000,
  distanceInterval = 3,
}: UseLocationTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);

  const [backgroundStatus, setBackgroundStatus] =
    useState<BackgroundTrackingStatus>("idle");

  const [permissionGranted, setPermissionGranted] =
    useState(false);

  const [backgroundPermissionGranted, setBackgroundPermissionGranted] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastLocation, setLastLocation] =
    useState<Location.LocationObject | null>(null);

  const subscriptionRef =
    useRef<Location.LocationSubscription | null>(null);

  const sendingRef = useRef(false);

  /*
   * Generation changes whenever foreground
   * tracking is cancelled.
   */
  const generationRef = useRef(0);

  /*
   * Avoid duplicate start attempts for
   * the same generation.
   */
  const startingGenerationRef = useRef<number | null>(null);

  const mountedRef = useRef(false);

  const activeRef = useRef(false);

  /*
   * Keep latest flags accessible to async callbacks.
   */
  activeRef.current = enabled && ready;

  /*
   * FOREGROUND SOCKET LOCATION
   */
  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      if (
        !mountedRef.current ||
        !activeRef.current ||
        sendingRef.current
      ) {
        return;
      }

      sendingRef.current = true;

      try {
        if (!isSocketConnected()) {
          await connectSocket();
        }

        if (!mountedRef.current || !activeRef.current) {
          return;
        }

        
await emitDriverLocation({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,

  accuracy: location.coords.accuracy,
  speed: location.coords.speed,
  heading: location.coords.heading,

  // Original GPS acquisition time.
  recordedAt: new Date(location.timestamp).toISOString(),
});


        if (mountedRef.current) {
          setError(null);
        }
      } catch (err) {
        if (mountedRef.current && activeRef.current) {
          setError(
            getErrorMessage(err, "Unable to send location"),
          );
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [],
  );

  /*
   * STOP FOREGROUND ONLY
   *
   * Navigation or app backgrounding must
   * not stop the native background task.
   */
  const stopForegroundTracking = useCallback(() => {
    ++generationRef.current;

    subscriptionRef.current?.remove();
    subscriptionRef.current = null;

    /*
     * Do not unlock an in-flight network request
     * here. Its finally block owns sendingRef.
     */
    if (mountedRef.current) {
      setIsTracking(false);
    }
  }, []);

  /*
   * START TRACKING
   */
  const startTracking = useCallback(async () => {
    if (!mountedRef.current || !activeRef.current) {
      return;
    }

    const generation = generationRef.current;

    if (
      subscriptionRef.current ||
      startingGenerationRef.current === generation
    ) {
      return;
    }

    startingGenerationRef.current = generation;

    const stillCurrent = () =>
      mountedRef.current &&
      activeRef.current &&
      generationRef.current === generation;

    try {
      setError(null);

      /*
       * Request foreground permission first.
       */
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!stillCurrent()) {
        return;
      }

      if (permission.status !== "granted") {
        setPermissionGranted(false);
        setBackgroundPermissionGranted(false);
        setBackgroundStatus("unavailable");
        setError("Location permission is required");
        return;
      }

      setPermissionGranted(true);

      /*
       * NATIVE BACKGROUND TRACKING
       *
       * This is independent of the React watcher.
       */
      setBackgroundStatus("starting");

      try {
        await queueBackgroundOperation(async () => {
          /*
           * A shift may have ended while this
           * request was waiting in the queue.
           */
          if (!stillCurrent()) {
            return;
          }

          await startBackgroundLocationTracking();
        });

        if (stillCurrent()) {
          const running =
            await isBackgroundLocationTracking();

          if (!stillCurrent()) {
            return;
          }

          setBackgroundStatus(
            running ? "active" : "unavailable",
          );

          setBackgroundPermissionGranted(running);
        }
      } catch (err) {
        console.warn(
          "[Location] Background tracking unavailable:",
          err,
        );

        if (stillCurrent()) {
          setBackgroundStatus("unavailable");
          setBackgroundPermissionGranted(false);

          setError(
            getErrorMessage(
              err,
              "Background location tracking is unavailable",
            ),
          );
        }

        /*
         * Continue foreground tracking even
         * if background permission was denied.
         */
      }

      if (!stillCurrent()) {
        return;
      }

      /*
       * FOREGROUND GPS WATCHER
       *
       * Socket.IO connects when a location
       * actually needs to be transmitted.
       */
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: intervalMs,
          distanceInterval,
        },
        (location) => {
          if (!stillCurrent()) {
            return;
          }

          setLastLocation(location);
          void sendLocation(location);
        },
      );

      /*
       * Important: async watchPositionAsync
       * might resolve after tracking stopped.
       */
      if (!stillCurrent()) {
        subscription.remove();
        return;
      }

      subscriptionRef.current = subscription;
      setIsTracking(true);

      /*
       * Obtain an initial position without
       * delaying watcher registration.
       */
      void Location.getLastKnownPositionAsync({
        maxAge: 15000,
      })
        .then((location) => {
          if (!location || !stillCurrent()) {
            return;
          }

          setLastLocation(location);
          void sendLocation(location);
        })
        .catch(() => undefined);
    } catch (err) {
      if (stillCurrent()) {
        setError(
          getErrorMessage(
            err,
            "Unable to start foreground location tracking",
          ),
        );

        setIsTracking(false);
      }
    } finally {
      if (startingGenerationRef.current === generation) {
        startingGenerationRef.current = null;
      }
    }
  }, [intervalMs, distanceInterval, sendLocation]);

  /*
   * FULL STOP
   *
   * Only run after the backend has confirmed
   * that the driver's shift is inactive.
   */
  const stopTracking = useCallback(async () => {
    activeRef.current = false;

    stopForegroundTracking();

    try {
      await queueBackgroundOperation(async () => {
        await stopBackgroundLocationTracking();
      });

      if (mountedRef.current && !activeRef.current) {
        setBackgroundStatus("idle");
        setBackgroundPermissionGranted(false);
      }
    } catch (err) {
      console.warn(
        "[Location] Unable to stop background tracking:",
        err,
      );

      if (mountedRef.current) {
        setError(
          getErrorMessage(
            err,
            "Unable to stop background tracking",
          ),
        );
      }
    }
  }, [stopForegroundTracking]);

  /*
   * COMPONENT LIFECYCLE
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      /*
       * Stop foreground watcher only.
       * Leave native background tracking intact.
       */
      stopForegroundTracking();
    };
  }, [stopForegroundTracking]);

  /*
   * SHIFT-BASED TRACKING
   */
  useEffect(() => {
    /*
     * Shift status is unknown.
     *
     * Never interpret loading or API failure
     * as a confirmed ended shift.
     */
    if (!ready) {
      return () => {
        stopForegroundTracking();
      };
    }

    if (enabled) {
      void startTracking();
    } else {
      void stopTracking();
    }

    return () => {
      stopForegroundTracking();
    };
  }, [
    enabled,
    ready,
    startTracking,
    stopTracking,
    stopForegroundTracking,
  ]);

  /*
   * APP FOREGROUND / BACKGROUND
   *
   * Do not rely on the Socket.IO watcher
   * to remain active in the background.
   */
  useEffect(() => {
    const listener = AppState.addEventListener(
      "change",
      (state) => {
        if (state !== "active") {
          stopForegroundTracking();
          return;
        }

        if (activeRef.current) {
          void startTracking();
        }
      },
    );

    return () => {
      listener.remove();
    };
  }, [startTracking, stopForegroundTracking]);

  return {
    /*
     * Foreground watcher status.
     */
    isTracking,

    permissionGranted,

    /*
     * Native background tracking status.
     */
    backgroundStatus,
    backgroundPermissionGranted,

    error,
    lastLocation,

    startTracking,
    stopTracking,
  };
}
