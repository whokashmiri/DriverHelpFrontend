import * as FileSystem from "expo-file-system/legacy";
import {
  type ActiveOrderResponse,
  type CompleteOrderDeliveryPayload,
  type CreatePickupOrderPayload,
  type DeleteOrderResponse,
  type OrderResponse,
  type OrdersResponse,
} from "../types/order";

import { api, API_BASE_URL, getToken } from "./client";

function getFileFromUri(uri: string, name: string) {
  const cleanUri = uri.split("?")[0];

  const uriParts = cleanUri.split(".");

  const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";

  let mimeType = "image/jpeg";

  if (fileExtension === "png") {
    mimeType = "image/png";
  } else if (fileExtension === "webp") {
    mimeType = "image/webp";
  }

  return {
    uri,
    name: `${name}.${fileExtension}`,
    type: mimeType,
  } as any;
}

export async function createPickupOrder(params: CreatePickupOrderPayload) {
  if (!params.pickupPhoto?.uri) {
    throw new Error("Pickup photo URI is missing");
  }

  const token = await getToken();

  const response = await FileSystem.uploadAsync(
    `${API_BASE_URL}/orders/pickup`,
    params.pickupPhoto.uri,
    {
      httpMethod: "POST",

      uploadType: FileSystem.FileSystemUploadType.MULTIPART,

      fieldName: "pickupPhoto",

      mimeType: "image/jpeg",

      parameters: {
        pickupTime: params.pickupPhoto.time.toISOString(),

        ...(params.notes?.trim()
          ? {
              notes: params.notes.trim(),
            }
          : {}),
      },

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  let data: OrderResponse;

  try {
    data = JSON.parse(response.body);
  } catch {
    throw new Error(`Invalid server response: ${response.body}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(data?.message || "Unable to create pickup order");
  }

  return data;
}

export async function completeOrderDelivery(
  params: CompleteOrderDeliveryPayload,
) {
  if (!params.deliveryPhoto?.uri) {
    throw new Error("Delivery photo URI is missing");
  }

  const token = await getToken();

  const response = await FileSystem.uploadAsync(
    `${API_BASE_URL}/orders/${params.orderId}/delivery`,
    params.deliveryPhoto.uri,
    {
      httpMethod: "PATCH",

      uploadType: FileSystem.FileSystemUploadType.MULTIPART,

      fieldName: "deliveryPhoto",

      mimeType: "image/jpeg",

      parameters: {
        deliveryTime: params.deliveryPhoto.time.toISOString(),
      },

      headers: {
        Accept: "application/json",

        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
    },
  );

  let data: OrderResponse;

  try {
    data = JSON.parse(response.body);
  } catch {
    throw new Error(`Invalid server response: ${response.body}`);
  }

  if (response.status < 200 || response.status >= 300) {
    throw new Error(data?.message || "Unable to complete delivery");
  }

  return data;
}

export async function getActiveOrder() {
  const response = await api.get<ActiveOrderResponse>("/orders/active");

  return response.data;
}

export async function getMyOrders() {
  const response = await api.get<OrdersResponse>("/orders/my");

  return response.data;
}

export async function getOrderById(orderId: string) {
  const response = await api.get<OrderResponse>(`/orders/${orderId}`);

  return response.data;
}

export async function deleteOrder(orderId: string) {
  const response = await api.delete<DeleteOrderResponse>(`/orders/${orderId}`);

  return response.data;
}

export async function getSupervisorActiveOrders() {
  const response = await api.get<OrdersResponse>("/orders/supervisor/active");

  return response.data;
}
