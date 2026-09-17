import { useCallback, useEffect, useRef, useState } from "react";

import * as Location from "expo-location";

import { emitDriverLocation } from "../socket/socket";

import { getErrorMessage } from "../utils";

type UseLocationTrackingOptions = {
  enabled: boolean;

  intervalMs?: number;

  distanceInterval?: number;
};

export function useLocationTracking({
  enabled,
  intervalMs = 10000,
  distanceInterval = 10,
}: UseLocationTrackingOptions) {
  const [isTracking, setIsTracking] = useState(false);

  const [permissionGranted, setPermissionGranted] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [lastLocation, setLastLocation] =
    useState<Location.LocationObject | null>(null);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const stopTracking = useCallback(() => {
    subscriptionRef.current?.remove();

    subscriptionRef.current = null;

    setIsTracking(false);
  }, []);

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

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,

          timeInterval: intervalMs,

          distanceInterval,
        },
        async (location) => {
          setLastLocation(location);

          try {
            await emitDriverLocation({
              latitude: location.coords.latitude,

              longitude: location.coords.longitude,

              accuracy: location.coords.accuracy,

              speed: location.coords.speed,

              heading: location.coords.heading,
            });
          } catch (err) {
            setError(getErrorMessage(err, "Unable to send location"));
          }
        },
      );

      subscriptionRef.current = subscription;

      setIsTracking(true);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to start location tracking"));

      setIsTracking(false);
    }
  }, [intervalMs, distanceInterval]);

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
