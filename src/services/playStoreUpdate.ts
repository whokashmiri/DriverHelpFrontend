//services/playStoreUpdate.ts
//
// Google Play In-App Updates: asks the Play Store on the device whether a
// newer versionCode of this app is published. Works only for installs that
// came from Google Play (including internal / closed testing tracks).

import { Platform } from "react-native";

type InAppUpdatesModule = typeof import("expo-in-app-updates");

let cachedModule: InAppUpdatesModule | null | undefined;

// The native module is missing in Expo Go and in builds made before this
// dependency was added, and importing it there throws. Load it lazily so
// those builds keep working (they still have the backend version gate).
function getModule(): InAppUpdatesModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    cachedModule = require("expo-in-app-updates") as InAppUpdatesModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
}

export type PlayStoreUpdate = {
  storeVersionCode: number;
};

/**
 * Returns the Play Store's version when it is newer than the installed one,
 * or null when the app is up to date or the check cannot be made
 * (not Android, not installed from Play, no network, etc.).
 */
export async function checkPlayStoreUpdate(): Promise<PlayStoreUpdate | null> {
  if (Platform.OS !== "android") {
    return null;
  }

  const module = getModule();

  if (!module) {
    return null;
  }

  try {
    const info = await module.checkForUpdate();

    if (!info.updateAvailable) {
      return null;
    }

    const storeVersionCode = Number(info.storeVersion);

    return {
      storeVersionCode: Number.isSafeInteger(storeVersionCode)
        ? storeVersionCode
        : 0,
    };
  } catch (error) {
    console.warn("[AppUpdate] Play Store check failed:", error);
    return null;
  }
}

/**
 * Starts Google Play's full-screen (immediate) update flow.
 * Returns false when the flow could not be started, so the caller can fall
 * back to opening the Play Store listing.
 */
export async function startPlayStoreUpdate(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  const module = getModule();

  if (!module) {
    return false;
  }

  try {
    return await module.startUpdate(true);
  } catch (error) {
    console.warn("[AppUpdate] Could not start in-app update:", error);
    return false;
  }
}
