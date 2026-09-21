import { api } from "./client";

import type {
  Driver,
  VehicleType
} from "../types/driver";

export interface CreateDriverPayload {
  iqamaId: string;
  name: string;
  password: string;

  phone?: string;

  vehicleType:
    VehicleType;
}

export interface UpdateDriverPayload {
  name?: string;
  iqamaId?: string;

  phone?:
    | string
    | null;

  password?: string;

  vehicleType?:
    VehicleType;
}

export async function createDriver(
  payload:
    CreateDriverPayload,
) {
  const response =
    await api.post<{
      success: boolean;
      message: string;
      driver: Driver;
    }>(
      "/drivers",
      payload,
    );

  return response.data;
}

export async function getMyDrivers() {
  const response =
    await api.get<{
      success: boolean;

      count: number;

      workingCount?: number;

      notWorkingCount?: number;

      drivers: Driver[];
    }>(
      "/drivers",
    );

  return response.data;
}

export async function getDriverById(
  driverId: string,
) {
  const response = await api.get<{
    success: boolean;
    driver: Driver;
  }>(`/drivers/${driverId}`);

  return response.data;
}

export async function updateDriver(
  driverId: string,
  payload: UpdateDriverPayload,
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
    driver: Driver;
  }>(
    `/drivers/${driverId}`,
    payload,
  );

  return response.data;
}

export async function updateDriverStatus(
  driverId: string,
  isActive: boolean,
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
    driver: Driver;
  }>(
    `/drivers/${driverId}/status`,
    {
      isActive,
    },
  );

  return response.data;
}