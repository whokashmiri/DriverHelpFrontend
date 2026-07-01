import { api, saveToken } from "./client";

type AuthPayload = {
  iqamaId: string;
  password: string;
};

export async function login(payload: AuthPayload) {
  const response = await api.post("/auth/login", payload);

  const token = response.data?.token;

  if (token) {
    await saveToken(token);
  }

  return response.data;
}

export async function register(payload: AuthPayload) {
  const response = await api.post("/auth/register", payload);

  // Do not save token after register.
  // User should login manually after successful registration.
  return response.data;
}

export async function getMe() {
  const response = await api.get("/auth/me");
  return response.data;
}
