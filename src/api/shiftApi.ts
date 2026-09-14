import { api } from "./client";

export type ShiftStatus = "active" | "completed";

export interface DriverShift {
  _id?: string;
  id?: string;

  driver?: string;
  supervisor?: string;

  startedAt: string;

  endedAt: string | null;

  durationSeconds: number | null;

  durationHours?: number;

  status: ShiftStatus;

  createdAt?: string;
  updatedAt?: string;
}

export async function startShift() {
  const response = await api.post<{
    success: boolean;
    message: string;
    shift: DriverShift;
  }>("/shifts/start");

  return response.data;
}

export async function endShift() {
  const response = await api.post<{
    success: boolean;
    message: string;
    shift: DriverShift;
  }>("/shifts/end");

  return response.data;
}

export async function getActiveShift() {
  const response = await api.get<{
    success: boolean;
    shift: DriverShift | null;
  }>("/shifts/active");

  return response.data;
}

export async function getMyShifts() {
  const response = await api.get<{
    success: boolean;
    count: number;
    shifts: DriverShift[];
  }>("/shifts/my");

  return response.data;
}
