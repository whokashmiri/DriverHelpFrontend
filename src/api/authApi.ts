import {
  type AuthResponse,
  type LoginPayload,
  type MeResponse,
  type RegisterPayload,
} from "../types/auth";

import { api, removeToken, saveToken } from "./client";

export async function login(payload: LoginPayload) {
  const response = await api.post<AuthResponse>("/auth/login", payload);

  const token = response.data?.token;

  if (token) {
    await saveToken(token);
  }

  return response.data;
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<AuthResponse>("/auth/register", payload);

  return response.data;
}

export async function getMe() {
  const response = await api.get<MeResponse>("/auth/me");

  return response.data;
}

export async function logout() {
  await removeToken();
}
