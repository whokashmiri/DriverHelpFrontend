
export type DriverWorkStatus = "working" | "not_started";

export type VehicleType = "car" | "bike";

export interface DriverProfilePicture {
  url: string | null;
  publicId: string | null;
}

/**
 * GeoJSON coordinates are stored as:
 * [longitude, latitude]
 */
export interface DriverAccommodationLocation {
  type: "Point";
  coordinates: [number, number];
}

export interface DriverAccommodation {
  address?: string | null;
  location?: DriverAccommodationLocation | null;
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


  vehiclePlateNumber?: string | null;

  accommodation?: DriverAccommodation | null;

  role: "driver";

  isActive: boolean;

  supervisor?: string | null;

  canDeliverOrders?: boolean;

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

  vehiclePlateNumber?: string | null;

  accommodation?: DriverAccommodation | null;

  profilePictureUri?: string | null;
}

export interface UpdateDriverPayload {
  name?: string;

  shortName?: string | null;

  iqamaId?: string;

  phone?: string | null;

  password?: string;

  vehicleType?: VehicleType | null;

  /**
   * null or empty string clears the plate.
   */
  vehiclePlateNumber?: string | null;

  /**
   * undefined = do not update
   * null = clear accommodation
   * object = update provided accommodation fields
   */
  accommodation?: DriverAccommodation | null;

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
