import { api, removeToken, saveToken } from "./client";

export type UserRole = "driver" | "supervisor" | "admin";

export interface AuthUser {
  id: string;
  iqamaId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  supervisor?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface LoginPayload {
  iqamaId: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  iqamaId: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;

  user: AuthUser;
}

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

  /**
   * Don't save token.
   *
   * User logs in manually after registration.
   */
  return response.data;
}

export async function getMe() {
  const response = await api.get<{
    success: boolean;
    user: AuthUser;
  }>("/auth/me");

  return response.data;
}

export async function logout() {
  await removeToken();
}
