import { useCallback, useEffect, useRef, useState } from "react";

import * as Location from "expo-location";

import {
  connectSocket,
  emitDriverLocation,
  isSocketConnected,
} from "../socket/socket";

import {
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "../services/backgroundLocation";

import { getErrorMessage } from "../utils";

type UseLocationTrackingOptions = {
  enabled: boolean;

  intervalMs?: number;

  distanceInterval?: number;
};

export function useLocationTracking({
  enabled,

  intervalMs = 3000,

  distanceInterval = 3,
}: UseLocationTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);

  const [permissionGranted, setPermissionGranted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastLocation, setLastLocation] =
    useState<Location.LocationObject | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const sendingRef = useRef(false);

  /*
   * FOREGROUND SOCKET LOCATION
   */
  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;

      try {
        if (!isSocketConnected()) {
          await connectSocket();
        }

        await emitDriverLocation({
          latitude: location.coords.latitude,

          longitude: location.coords.longitude,

          accuracy: location.coords.accuracy,

          speed: location.coords.speed,

          heading: location.coords.heading,
        });

        setError(null);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to send location"));
      } finally {
        sendingRef.current = false;
      }
    },
    [],
  );

  /*
   * START
   */
  const startTracking = useCallback(async () => {
    try {
      if (subscriptionRef.current) {
        return;
      }

      setError(null);

      /*
       * Foreground permission.
       */
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setPermissionGranted(false);

        setError("Location permission is required");

        return;
      }

      setPermissionGranted(true);

      /*
       * Start native background
       * tracking.
       *
       * This continues independently
       * of this React hook.
       */
      try {
        await startBackgroundLocationTracking();
      } catch (err) {
        console.warn("[Location] Background tracking unavailable:", err);

        /*
         * Do NOT stop foreground
         * tracking just because
         * background permission was
         * denied.
         */
      }

      /*
       * Foreground Socket.IO.
       */
      if (!isSocketConnected()) {
        await connectSocket();
      }

      /*
       * Send one position now.
       */
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLastLocation(initialLocation);

        void sendLocation(initialLocation);
      } catch {
        /*
         * watchPositionAsync will
         * provide the next location.
         */
      }

      /*
       * Foreground live updates.
       */
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,

          timeInterval: intervalMs,

          distanceInterval,
        },

        (location) => {
          setLastLocation(location);

          void sendLocation(location);
        },
      );

      subscriptionRef.current = subscription;

      setIsTracking(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to start location tracking"));

      setIsTracking(false);
    }
  }, [intervalMs, distanceInterval, sendLocation]);

  /*
   * Stop ONLY foreground watcher.
   *
   * This is intentionally separate
   * from stopping background tracking.
   */
  const stopForegroundTracking = useCallback(() => {
    subscriptionRef.current?.remove();

    subscriptionRef.current = null;

    sendingRef.current = false;

    setIsTracking(false);
  }, []);

  /*
   * Full stop.
   *
   * Call when shift actually ends.
   */
  const stopTracking = useCallback(async () => {
    stopForegroundTracking();

    try {
      await stopBackgroundLocationTracking();
    } catch (err) {
      console.warn("[Location] Unable to stop background tracking:", err);
    }
  }, [stopForegroundTracking]);

  useEffect(() => {
    if (enabled) {
      void startTracking();
    } else {
      void stopTracking();
    }

    /*
     * IMPORTANT:
     *
     * On component unmount,
     * remove foreground listener only.
     *
     * DO NOT stop native background
     * tracking here.
     *
     * Otherwise navigating away from
     * the screen would stop tracking.
     */
    return () => {
      stopForegroundTracking();
    };
  }, [enabled, startTracking, stopTracking, stopForegroundTracking]);

  return {
    isTracking,

    permissionGranted,

    error,

    lastLocation,

    startTracking,

    stopTracking,
  };
}
