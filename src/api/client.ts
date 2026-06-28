//src/api/client.ts
import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = "http://192.168.0.198:5000/api";
// Replace 192.168.1.20 with your laptop/computer IP address

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export async function saveToken(token: string) {
  await SecureStore.setItemAsync("authToken", token);
}

export async function getToken() {
  return SecureStore.getItemAsync("authToken");
}

export async function removeToken() {
  await SecureStore.deleteItemAsync("authToken");
}