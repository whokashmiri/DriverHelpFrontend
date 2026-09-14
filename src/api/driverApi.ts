import { api } from "./client";

export interface Driver {
  id?: string;
  _id?: string;

  iqamaId: string;
  name: string;

  phone?: string | null;

  role: "driver";

  isActive: boolean;

  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface CreateDriverPayload {
  iqamaId: string;
  name: string;
  password: string;
  phone?: string;
}

export async function createDriver(payload: CreateDriverPayload) {
  const response = await api.post<{
    success: boolean;
    message: string;
    driver: Driver;
  }>("/drivers", payload);

  return response.data;
}

export async function getMyDrivers() {
  const response = await api.get<{
    success: boolean;
    count: number;
    drivers: Driver[];
  }>("/drivers");

  return response.data;
}

export async function getDriverById(driverId: string) {
  const response = await api.get<{
    success: boolean;
    driver: Driver;
  }>(`/drivers/${driverId}`);

  return response.data;
}

export async function updateDriverStatus(driverId: string, isActive: boolean) {
  const response = await api.patch<{
    success: boolean;
    message: string;
    driver: Driver;
  }>(`/drivers/${driverId}/status`, {
    isActive,
  });

  return response.data;
}
