import { api } from "./client";

export type StatsPeriod = "today" | "week" | "month";

export interface OrderStats {
  total: number;
  pickedUp: number;
  delivered: number;
}

export interface WorkStats {
  totalSeconds: number;
  totalHours: number;

  activeShift?: {
    id: string;
    startedAt: string;
  } | null;
}

export interface PeriodStats {
  orders: OrderStats;
  work: WorkStats;
}

export async function getMyStats(period: StatsPeriod = "today") {
  const response = await api.get<{
    success: boolean;

    period: StatsPeriod;

    timezone: string;

    range?: {
      start: string;
      end: string;
      timezone?: string;
    };

    orders: OrderStats;

    work: WorkStats;
  }>("/stats/me", {
    params: {
      period,
    },
  });

  return response.data;
}

export async function getMyDashboardStats() {
  const response = await api.get<{
    success: boolean;

    timezone: string;

    activeShift?: {
      id: string;
      startedAt: string;
    } | null;

    stats: {
      today: PeriodStats;
      week: PeriodStats;
      month: PeriodStats;
    };
  }>("/stats/me/dashboard");

  return response.data;
}

export async function getSupervisorDashboardStats() {
  const response = await api.get<{
    success: boolean;

    timezone: string;

    drivers: {
      total: number;
      active: number;
      inactive: number;
      workingNow: number;
    };

    stats: {
      today: PeriodStats;
      week: PeriodStats;
      month: PeriodStats;
    };
  }>("/stats/dashboard");

  return response.data;
}

export async function getDriverStats(
  driverId: string,
  period: StatsPeriod = "today",
) {
  const response = await api.get<{
    success: boolean;

    period: StatsPeriod;

    timezone: string;

    driver: {
      _id: string;
      name: string;
      iqamaId: string;
      phone?: string | null;
      isActive: boolean;
      lastLoginAt?: string | null;
    };

    orders: OrderStats;

    work: WorkStats;
  }>(`/stats/drivers/${driverId}`, {
    params: {
      period,
    },
  });

  return response.data;
}
