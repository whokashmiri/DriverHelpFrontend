
//hooks/useLocationTracking.ts

import { useCallback, useEffect, useRef, useState } from "react";

import { AppState } from "react-native";
import * as Location from "expo-location";

import {
  connectSocket,
  emitDriverLocation,
  isSocketConnected,
  pauseSocket
} from "../socket/socket";

import {
  ensureForegroundLocationPermission,
  isLocationPermissionPromptActive,
  isBackgroundLocationTracking,
  startBackgroundLocationTracking,
  stopBackgroundLocationTracking,
} from "../services/backgroundLocation";

import { getErrorMessage } from "../utils";

type UseLocationTrackingOptions = {
  enabled: boolean;

  
  ready?: boolean;

  intervalMs?: number;
  distanceInterval?: number;
};

type BackgroundTrackingStatus =
  | "idle"
  | "starting"
  | "active"
  | "unavailable";

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


  const generationRef = useRef(0);


  const startingGenerationRef = useRef<number | null>(null);

  const mountedRef = useRef(false);

  const activeRef = useRef(false);


  activeRef.current = enabled && ready;

  const sendLocation = useCallback(
    async (location: Location.LocationObject) => {
      if (
        !mountedRef.current ||
        !activeRef.current ||
        AppState.currentState !== "active" ||
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

        
console.log("[GPS] Received:", {
  recordedAt: new Date(
    location.timestamp,
  ).toISOString(),
  ageSeconds: Math.round(
    (Date.now() - location.timestamp) / 1000,
  ),
});

const acknowledgement =
  await emitDriverLocation({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    recordedAt: new Date(
      location.timestamp,
    ).toISOString(),
  });

console.log("[GPS] Socket ACK:", {
  success: acknowledgement.success,
  accepted: acknowledgement.accepted,
  recordedAt: acknowledgement.recordedAt,
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


  const stopForegroundTracking = useCallback(() => {
    ++generationRef.current;

    subscriptionRef.current?.remove();
    subscriptionRef.current = null;


    if (mountedRef.current) {
      setIsTracking(false);
    }
  }, []);

  
const startTracking = useCallback(async () => {
  if (!mountedRef.current || !activeRef.current) {
    return;
  }
  if (AppState.currentState !== "active") {
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
    AppState.currentState === "active" &&
    generationRef.current === generation;

  try {
    setError(null);

    const granted =
      await ensureForegroundLocationPermission();

    if (!stillCurrent()) {
      return;
    }

    if (!granted) {
      setPermissionGranted(false);
      setBackgroundPermissionGranted(false);
      setBackgroundStatus("unavailable");

      setError(
        "Foreground location permission is required",
      );

      return;
    }

    setPermissionGranted(true);

    // 2. START FOREGROUND GPS FIRST
    
    const subscription =
      await Location.watchPositionAsync(
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

          // Send GPS to supervisor through Socket.IO.
          void sendLocation(location);
        },
      );

    // Tracking may have stopped while awaiting subscription.
    if (!stillCurrent()) {
      subscription.remove();
      return;
    }

    subscriptionRef.current = subscription;
    setIsTracking(true);

    console.log(
      "[Location] Foreground GPS tracking started",
    );

    // 3. SEND INITIAL GPS POSITION


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
      .catch((err) => {
        console.warn(
          "[Location] Initial GPS unavailable:",
          err,
        );
      });

   
    // 4. START BACKGROUND TRACKING SEPARATELY
   

    setBackgroundStatus("starting");

    void queueBackgroundOperation(async () => {
      
      if (!stillCurrent()) {
        return;
      }

      await startBackgroundLocationTracking();
    })
      .then(async () => {
        const running =
          await isBackgroundLocationTracking();

        
        if (
          !mountedRef.current ||
          !activeRef.current ||
          generationRef.current !== generation
        ) {
          return;
        }

        setBackgroundStatus(
          running ? "active" : "unavailable",
        );

        setBackgroundPermissionGranted(running);

        console.log(
          "[Location] Background tracking status:",
          running ? "active" : "unavailable",
        );
      })
      .catch((err) => {
        console.warn(
          "[Location] Background tracking unavailable:",
          err,
        );

        if (
          !mountedRef.current ||
          !activeRef.current ||
          generationRef.current !== generation
        ) {
          return;
        }

        setBackgroundStatus("unavailable");
        setBackgroundPermissionGranted(false);

      });

  } catch (err) {
    console.error(
      "[Location] Foreground GPS startup failed:",
      err,
    );

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
    if (
      startingGenerationRef.current === generation
    ) {
      startingGenerationRef.current = null;
    }
  }
}, [intervalMs, distanceInterval, sendLocation]);

 
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

    
      stopForegroundTracking();
    };
  }, [stopForegroundTracking]);
  useEffect(() => {
 
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


useEffect(() => {
  const handleAppStateChange = (
    state: string,
  ) => {
  
    if (
      state !== "active" &&
      isLocationPermissionPromptActive()
    ) {
      return;
    }

    if (state !== "active") {
      console.log(
        "[Location] App backgrounded",
      );

      stopForegroundTracking();
      pauseSocket();

     
      return;
    }

    console.log(
      "[Location] App foregrounded",
    );

    if (activeRef.current) {
      void startTracking();
    }
  };

  const listener = AppState.addEventListener(
    "change",
    handleAppStateChange,
  );

  return () => {
    listener.remove();
  };
}, [startTracking, stopForegroundTracking]);

  return {

    isTracking,

    permissionGranted,

  
    backgroundStatus,
    backgroundPermissionGranted,

    error,
    lastLocation,

    startTracking,
    stopTracking,
  };
}
