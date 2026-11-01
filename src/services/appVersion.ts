import * as Application from "expo-application";
import { Platform } from "react-native";

export const APP_PLATFORM = Platform.OS;

export const ANDROID_VERSION_CODE = Number(
  Application.nativeBuildVersion
);

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.drivo.mobileapp";

export type VersionPolicy = {
  latestVersionCode: number;
  minimumVersionCode: number;
  forceUpdate: boolean;
  storeUrl: string;
};

export function isUpdateRequired(
  policy: VersionPolicy
): boolean {
  if (Platform.OS !== "android") {
    return false;
  }

  return (
    policy.forceUpdate &&
    (
      !Number.isSafeInteger(ANDROID_VERSION_CODE) ||
      ANDROID_VERSION_CODE <= 0 ||
      ANDROID_VERSION_CODE < policy.minimumVersionCode
    )
  );
}