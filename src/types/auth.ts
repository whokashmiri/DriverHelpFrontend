export type UserRole = "driver" | "supervisor" | "admin";
export type VehicleType = "car" | "bike" | "other";

export interface AuthUser {
  id: string;
  iqamaId: string;
  name: string;

  phone?: string | null;

  role: UserRole;

  isActive: boolean;

  canDeliverOrders: boolean;
  vehiclePlateNumber:string | null;

  supervisor?: string | null;
  vehicleType?: VehicleType | null;

  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}
