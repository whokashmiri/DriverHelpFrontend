
import { api } from "./client";

export async function registerPushToken(
  token: string,
) {
  const response = await api.post(
    "/notifications/token",
    { token },
  );

  return response.data;
}

export async function unregisterPushToken(
  token: string,
) {
  const response = await api.delete(
    "/notifications/token",
    {
      data: { token },
    },
  );

  return response.data;
}
