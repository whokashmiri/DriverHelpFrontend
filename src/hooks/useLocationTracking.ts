import { useCallback, useEffect, useRef, useState } from "react";

import * as Location from "expo-location";

import {
  connectSocket,
  emitDriverLocation,
  isSocketConnected,
} from "../socket/socket";

import { getErrorMessage } from "../utils";

type UseLocationTrackingOptions = {
  enabled: boolean;

  intervalMs?: number;

  distanceInterval?: number;
};

export function useLocationTracking({
  enabled,

  /*
   * Near-live tracking.
   */
  intervalMs = 3000,

  distanceInterval = 3,
}: UseLocationTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);

  const [permissionGranted, setPermissionGranted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastLocation, setLastLocation] =
    useState<Location.LocationObject | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  /*
   * Prevent multiple simultaneous
   * socket sends if GPS fires faster
   * than the network acknowledgement.
   */
  const sendingRef = useRef(false);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();

    subscriptionRef.current = null;

    sendingRef.current = false;

    setIsTracking(false);
  }, []);

  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      /*
       * Don't stack requests.
       */
      if (sendingRef.current) {
        return;
      }

      sendingRef.current = true;

      try {
        /*
         * Socket may temporarily
         * disconnect because of
         * network changes.
         */
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

        /*
         * Clear previous transient
         * socket/location error once
         * sending works again.
         */
        setError(null);
      } catch (err) {
        setError(getErrorMessage(err, "Unable to send location"));
      } finally {
        sendingRef.current = false;
      }
    },
    [],
  );

  const startTracking = useCallback(async () => {
    try {
      if (subscriptionRef.current) {
        return;
      }

      setError(null);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setPermissionGranted(false);

        setError("Location permission is required");

        return;
      }

      setPermissionGranted(true);

      /*
       * Make sure Socket.IO is
       * available before GPS starts.
       */
      if (!isSocketConnected()) {
        await connectSocket();
      }

      /*
       * Send one position immediately
       * instead of waiting for the
       * first watch callback.
       */
      try {
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLastLocation(initialLocation);

        void sendLocation(initialLocation);
      } catch {
        /*
         * watchPositionAsync below
         * can still provide location.
         */
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,

          timeInterval: intervalMs,

          distanceInterval,
        },

        (location) => {
          /*
           * Update local UI
           * immediately.
           */
          setLastLocation(location);

          /*
           * Do not block Expo's
           * GPS callback.
           */
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

  useEffect(() => {
    if (enabled) {
      void startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    isTracking,

    permissionGranted,

    error,

    lastLocation,

    startTracking,

    stopTracking,
  };
}
