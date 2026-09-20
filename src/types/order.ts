export type OrderStatus =
  | "picked_up"
  | "delivered"
  | "cancelled";

export type OrderCancellationReason =
  | "customer_unavailable"
  | "wrong_address"
  | "vehicle_issue"
  | "order_issue"
  | "emergency"
  | "other";

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
  orderId: number | null;

  rider: string | OrderRider;

  supervisor: string;

  pickupPhoto: OrderPhoto;

  deliveryPhoto: OrderPhoto | null;

  pickupTime: string;

  deliveryTime: string | null;

  durationSeconds: number | null;

  status: OrderStatus;

  notes: string;

  cancellationReason:
    | OrderCancellationReason
    | null;

  cancellationNotes: string;

  cancellationPhotos: OrderPhoto[];

  cancelledAt: string | null;

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

export interface CancelOrderPayload {
  orderId: string;

  cancellationReason:
    OrderCancellationReason;

  cancellationNotes?: string;

  cancellationPhotos?: OrderPhotoInput[];

  cancelledAt?: Date;
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