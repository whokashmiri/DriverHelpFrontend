export type DriverWorkStatus = "working" | "not_started";

export interface Driver {
  id?: string;
  _id?: string;

  iqamaId: string;
  name: string;
  phone?: string | null;

  role: "driver";

  isActive: boolean;

  supervisor?: string | null;

  lastLoginAt?: string | null;

  workStatus?: DriverWorkStatus;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDriverPayload {
  iqamaId: string;
  name: string;
  password: string;
  phone?: string;
}

export interface CreateDriverResponse {
  success: boolean;
  message: string;
  driver: Driver;
}

export interface DriversResponse {
  success: boolean;
  count: number;
  drivers: Driver[];
}

export interface DriverResponse {
  success: boolean;
  driver: Driver;
}

export interface UpdateDriverStatusPayload {
  isActive: boolean;
}

export interface UpdateDriverStatusResponse {
  success: boolean;
  message: string;
  driver: Driver;
}
