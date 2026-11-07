import axios from "axios";
import * as SecureStore from "expo-secure-store";

import {
  APP_PLATFORM,
  ANDROID_VERSION_CODE,
  PLAY_STORE_URL,
  type VersionPolicy,
} from "../services/appVersion";

import {
  notifyUpdateRequired,
} from "../services/updateRequired";

// Production:
// export const SERVER_URL =
//   "https://driverhelp.167.71.231.64.nip.io";

// Local development:
export const SERVER_URL =
  "http://192.168.0.138:9000";

export const API_BASE_URL = `${SERVER_URL}/api`;

const AUTH_TOKEN_KEY = "authToken";
export const REGISTERED_PUSH_TOKEN_KEY =
  "registeredExpoPushToken";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(
      AUTH_TOKEN_KEY
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers.set(
      "X-App-Platform",
      APP_PLATFORM
    );

    if (
      APP_PLATFORM === "android" &&
      Number.isSafeInteger(ANDROID_VERSION_CODE) &&
      ANDROID_VERSION_CODE > 0
    ) {
      config.headers.set(
        "X-App-Version-Code",
        String(ANDROID_VERSION_CODE)
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (
      error.response?.status === 426 &&
      error.response?.data?.code ===
        "APP_UPDATE_REQUIRED"
    ) {
      const data = error.response.data;

      const policy: VersionPolicy = {
        latestVersionCode:
          data.latestVersionCode,

        minimumVersionCode:
          data.minimumVersionCode,

        forceUpdate: true,

        storeUrl:
          data.storeUrl || PLAY_STORE_URL,
      };

      notifyUpdateRequired(policy);
    }

    return Promise.reject(error);
  }
);

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(
    AUTH_TOKEN_KEY,
    token
  );
}

export async function getToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}


export async function removeToken() {
  try {
    // Read the device token before
    // removing the authentication token.
    const authToken =
      await SecureStore.getItemAsync(
        AUTH_TOKEN_KEY,
      );

    const pushToken =
      await SecureStore.getItemAsync(
        REGISTERED_PUSH_TOKEN_KEY,
      );

    if (authToken && pushToken) {
      try {
     
        await api.delete(
          "/notifications/token",
          {
            data: {
              token: pushToken,
            },

            timeout: 5000,
          },
        );

        console.log(
          "[PUSH] Device token unregistered",
        );
      } catch (error) {
     
        console.warn(
          "[PUSH] Logout cleanup failed:",
          error,
        );
      }
    }
  } catch (error) {
    console.warn(
      "[PUSH] Unable to read device token:",
      error,
    );
  } finally {
   
    try {
      await SecureStore.deleteItemAsync(
        REGISTERED_PUSH_TOKEN_KEY,
      );
    } finally {
      await SecureStore.deleteItemAsync(
        AUTH_TOKEN_KEY,
      );
    }
  }
}
