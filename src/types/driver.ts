export type DriverWorkStatus = "working" | "not_started";

export type VehicleType = "car" | "bike";

export interface DriverProfilePicture {
  url: string | null;
  publicId: string | null;
}

export interface Driver {
  id?: string;
  _id?: string;

  iqamaId: string;

  name: string;

  shortName?: string | null;

  phone?: string | null;

  profilePicture?: DriverProfilePicture | null;

  vehicleType?: VehicleType | null;

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

  shortName?: string;

  password: string;

  phone?: string;

  vehicleType: VehicleType;

  profilePictureUri?: string | null;
}

export interface UpdateDriverPayload {
  name?: string;

  shortName?: string | null;

  iqamaId?: string;

  phone?: string | null;

  password?: string;

  vehicleType?: VehicleType | null;

  profilePictureUri?: string | null;
}

export interface CreateDriverResponse {
  success: boolean;

  message: string;

  driver: Driver;
}

export interface DriversResponse {
  success: boolean;

  count: number;

  workingCount?: number;

  notWorkingCount?: number;

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
