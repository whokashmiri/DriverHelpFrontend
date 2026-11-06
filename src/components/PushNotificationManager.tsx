
import { useEffect } from "react";

import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

import { useAuth } from "../hooks/useAuth";

import {
  registerPushToken,
  unregisterPushToken,
} from "../api/notificationApi";

import {
  REGISTERED_PUSH_TOKEN_KEY,
} from "../api/client";

import {
  getDriverExpoPushToken,
} from "../services/pushNotifications";

export default function PushNotificationManager() {
  const { user } = useAuth();

  const userId = user?.id ?? null;
  const isDriver = user?.role === "driver";
  const isActive = user?.isActive === true;

  useEffect(() => {
    if (!userId || !isDriver || !isActive) {
      return;
    }

    let cancelled = false;
    let registering = false;

    async function registerDevice() {
      if (registering || cancelled) {
        return;
      }

      registering = true;

      try {
        const token =
          await getDriverExpoPushToken();

        if (!token || cancelled) {
          return;
        }

        // Register the current device token
        // with the authenticated backend.
        await registerPushToken(token);

        if (cancelled) {
          return;
        }

        const previousToken =
          await SecureStore.getItemAsync(
            REGISTERED_PUSH_TOKEN_KEY,
          );

        await SecureStore.setItemAsync(
          REGISTERED_PUSH_TOKEN_KEY,
          token,
        );

        // A native token change may generate
        // a different Expo push token.
        if (
          previousToken &&
          previousToken !== token
        ) {
          try {
            await unregisterPushToken(
              previousToken,
            );
          } catch (error) {
            console.warn(
              "[PUSH] Previous token cleanup failed:",
              error,
            );
          }
        }

        console.log(
          "[PUSH] Device registered successfully",
        );
      } catch (error) {
        console.warn(
          "[PUSH] Registration failed:",
          error,
        );
      } finally {
        registering = false;
      }
    }

    // Register after authentication.
    void registerDevice();

    /*
     * Native push-token rotation.
     *
     * Refresh the Expo push token,
     * then synchronize it with the backend.
     */
    const subscription =
      Notifications.addPushTokenListener(() => {
        void registerDevice();
      });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [userId, isDriver, isActive]);

  return null;
}
