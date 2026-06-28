// src/api/orderApi.ts

import { api } from "./client";

type OrderPhoto = {
  uri: string;
  time: Date;
};

function getFileFromUri(uri: string, name: string) {
  const uriParts = uri.split(".");
  const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";

  const mimeType =
    fileExtension === "jpg" || fileExtension === "jpeg"
      ? "image/jpeg"
      : fileExtension === "png"
        ? "image/png"
        : "image/jpeg";

  return {
    uri,
    name: `${name}.${fileExtension}`,
    type: mimeType,
  } as any;
}

export async function createPickupOrder(params: {
  pickupPhoto: OrderPhoto;
  notes?: string;
}) {
  const formData = new FormData();

  formData.append(
    "pickupPhoto",
    getFileFromUri(params.pickupPhoto.uri, "pickup")
  );

  formData.append("pickupTime", params.pickupPhoto.time.toISOString());

  if (params.notes) {
    formData.append("notes", params.notes);
  }

  const response = await api.post("/orders/pickup", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function completeOrderDelivery(params: {
  orderId: string;
  deliveryPhoto: OrderPhoto;
}) {
  const formData = new FormData();

  formData.append(
    "deliveryPhoto",
    getFileFromUri(params.deliveryPhoto.uri, "delivery")
  );

  formData.append("deliveryTime", params.deliveryPhoto.time.toISOString());

  const response = await api.patch(
    `/orders/${params.orderId}/delivery`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

export async function getActiveOrder() {
  const response = await api.get("/orders/active");
  return response.data;
}

export async function getMyOrders() {
  const response = await api.get("/orders/my");
  return response.data;
}