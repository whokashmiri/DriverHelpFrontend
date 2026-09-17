import {
  type ActiveShiftResponse,
  type ShiftResponse,
  type ShiftsResponse,
} from "../types/shift";

import { api } from "./client";

export async function startShift() {
  const response = await api.post<ShiftResponse>("/shifts/start");

  return response.data;
}

export async function endShift() {
  const response = await api.post<ShiftResponse>("/shifts/end");

  return response.data;
}

export async function getActiveShift() {
  const response = await api.get<ActiveShiftResponse>("/shifts/active");

  return response.data;
}

export async function getMyShifts() {
  const response = await api.get<ShiftsResponse>("/shifts/my");

  return response.data;
}
