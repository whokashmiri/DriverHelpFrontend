export type OrderStatus = "picked_up" | "delivered";

export interface OrderPhotoInput {
  uri: string;
  time: Date;
}

export interface OrderPhoto {
  url: string;
  publicId: string;
  takenAt: string;
}

export interface OrderRider {
  _id: string;

  name?: string;
  iqamaId?: string;
}

export interface Order {
  _id: string;

  rider: string | OrderRider;

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

export interface CreatePickupOrderPayload {
  pickupPhoto: OrderPhotoInput;
  notes?: string;
}

export interface CompleteOrderDeliveryPayload {
  orderId: string;
  deliveryPhoto: OrderPhotoInput;
}

export interface OrderResponse {
  success: boolean;
  message?: string;
  order: Order;
}

export interface ActiveOrderResponse {
  success: boolean;
  order: Order | null;
}

export interface OrdersResponse {
  success: boolean;
  count: number;
  orders: Order[];
}

export interface DeleteOrderResponse {
  success: boolean;
  message: string;
}
