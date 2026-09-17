import axios from "axios";
import * as SecureStore from "expo-secure-store";

// Production:
// export const SERVER_URL =
//   "https://driverhelp.167.71.231.64.nip.io";

// Local development:
export const SERVER_URL = "http://192.168.0.138:9000";

export const API_BASE_URL = `${SERVER_URL}/api`;

const AUTH_TOKEN_KEY = "authToken";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getToken() {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
