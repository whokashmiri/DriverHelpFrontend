export interface LocationPayload {
  latitude: number;
  longitude: number;

  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
}

export interface DriverLocation {
  _id: string;

  driver:
    | string
    | {
        _id: string;
        name?: string;
        iqamaId?: string;
        phone?: string | null;
        isActive?: boolean;
      };

  supervisor: string;

  latitude: number;
  longitude: number;

  accuracy: number | null;
  speed: number | null;
  heading: number | null;

  recordedAt: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface LocationHistoryPoint {
  _id?: string;

  latitude: number;
  longitude: number;

  accuracy: number | null;
  speed: number | null;
  heading: number | null;

  recordedAt: string;
}

export interface UpdateMyLocationResponse {
  success: boolean;
  location: DriverLocation;
}

export interface MyLocationResponse {
  success: boolean;
  location: DriverLocation | null;
}

export interface DriversLocationsResponse {
  success: boolean;
  count: number;
  locations: DriverLocation[];
}

export interface DriverLocationResponse {
  success: boolean;

  driver: {
    _id: string;
    name: string;
    iqamaId: string;
    isActive: boolean;
  };

  location: DriverLocation | null;
}

export interface DriverShiftLocationHistoryResponse {
  success: boolean;

  shift: {
    id: string;
    startedAt: string;
    endedAt: string | null;
    status: "active" | "completed";
  };

  count: number;

  locations: LocationHistoryPoint[];
}

/**
 * Socket payload sent by driver.
 */
export type DriverLiveLocationPayload = LocationPayload;

/**
 * Socket payload received by supervisor.
 */
export interface DriverLiveLocationUpdate {
  driverId: string;

  latitude: number;
  longitude: number;

  accuracy: number | null;
  speed: number | null;
  heading: number | null;

  recordedAt: string;

  shiftId: string | null;

  isWorking: boolean;
}

export interface LocationAcknowledgement {
  success: boolean;

  recordedAt?: string;
  locationId?: string;

  message?: string;
}
