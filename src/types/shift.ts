export type ShiftStatus =
  | "active"
  | "completed";

export interface DriverShift {
  _id?: string;
  id?: string;

  driver?: string;
  supervisor?: string;

  startedAt: string;

  endedAt:
    | string
    | null;

  durationSeconds:
    | number
    | null;

  durationHours?: number;

  status: ShiftStatus;

  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftResponse {
  success: boolean;
  message?: string;
  shift: DriverShift;
}

export interface ActiveShiftResponse {
  success: boolean;
  shift: DriverShift | null;
}

export interface ShiftsResponse {
  success: boolean;
  count: number;
  shifts: DriverShift[];
}