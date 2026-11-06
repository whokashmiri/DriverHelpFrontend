
import { Platform } from "react-native";

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

export const SHIFT_NOTIFICATION_CHANNEL =
  "shift-reminders";

/*
 * Display notifications while the
 * application is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});



export async function configureNotificationChannel() {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(
    "shift-reminders",
    {
      name: "Shift Reminders",
      description:
        "Reminders to start and end your delivery shift.",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      enableVibrate: true,
      showBadge: true,
    },
  );
}



export async function getDriverExpoPushToken():
  Promise<string | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  if (!Device.isDevice) {
    console.warn(
      "[PUSH] Skipping push registration on an unsupported device",
    );
    return null;
  }

  await configureNotificationChannel();

  const existingPermission =
    await Notifications.getPermissionsAsync();

  let permission = existingPermission;

  if (!permission.granted) {
    if (!permission.canAskAgain) {
      console.warn(
        "[PUSH] Notification permission denied",
      );

      return null;
    }

    permission =
      await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    console.warn(
      "[PUSH] Notification permission not granted",
    );

    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (
    typeof projectId !== "string" ||
    projectId.length === 0
  ) {
    console.warn(
      "[PUSH] Missing EAS projectId",
    );

    return null;
  }

  const pushToken =
    await Notifications.getExpoPushTokenAsync({
      projectId,
    });

  return pushToken.data;
}
