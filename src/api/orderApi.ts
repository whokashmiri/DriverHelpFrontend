import { api } from "./client";

export interface OrderPhotoInput {
  uri: string;
  time: Date;
}

export interface OrderPhoto {
  url: string;
  publicId: string;
  takenAt: string;
}

export type OrderStatus = "picked_up" | "delivered";

export interface Order {
  _id: string;

  rider:
    | string
    | {
        _id: string;
        name?: string;
        iqamaId?: string;
      };

  supervisor: string;

  pickupPhoto: OrderPhoto;

  deliveryPhoto: OrderPhoto | null;

  pickupTime: string;
  deliveryTime: string | null;

  durationSeconds: number | null;

  status: OrderStatus;

  notes: string;

  createdAt: string;
  updatedAt: string;
}

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

export async function createPickupOrder(params: {
  pickupPhoto: OrderPhotoInput;
  notes?: string;
}) {
  const formData = new FormData();

  formData.append(
    "pickupPhoto",
    getFileFromUri(params.pickupPhoto.uri, "pickup"),
  );

  formData.append("pickupTime", params.pickupPhoto.time.toISOString());

  if (params.notes?.trim()) {
    formData.append("notes", params.notes.trim());
  }

  const response = await api.post<{
    success: boolean;
    message: string;
    order: Order;
  }>("/orders/pickup", formData);

  return response.data;
}

export async function completeOrderDelivery(params: {
  orderId: string;
  deliveryPhoto: OrderPhotoInput;
}) {
  const formData = new FormData();

  formData.append(
    "deliveryPhoto",
    getFileFromUri(params.deliveryPhoto.uri, "delivery"),
  );

  formData.append("deliveryTime", params.deliveryPhoto.time.toISOString());

  const response = await api.patch<{
    success: boolean;
    message: string;
    order: Order;
  }>(`/orders/${params.orderId}/delivery`, formData);

  return response.data;
}

export async function getActiveOrder() {
  const response = await api.get<{
    success: boolean;
    order: Order | null;
  }>("/orders/active");

  return response.data;
}

export async function getMyOrders() {
  const response = await api.get<{
    success: boolean;
    count: number;
    orders: Order[];
  }>("/orders/my");

  return response.data;
}

export async function getOrderById(orderId: string) {
  const response = await api.get<{
    success: boolean;
    order: Order;
  }>(`/orders/${orderId}`);

  return response.data;
}

export async function deleteOrder(orderId: string) {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/orders/${orderId}`);

  return response.data;
}
