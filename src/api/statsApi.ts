import {
  type DriverStatsResponse,
  type MyDashboardStatsResponse,
  type MyStatsResponse,
  type StatsPeriod,
  type SupervisorDashboardStatsResponse,
  type SupervisorDriversDashboardResponse,
  type SupervisorRangeStatsResponse,
} from "../types/stats";

import { api } from "./client";

export async function getMyStats(
  period: StatsPeriod = "today",
) {
  const response =
    await api.get<MyStatsResponse>(
      "/stats/me",
      {
        params: {
          period,
        },
      },
    );

  return response.data;
}

export async function getMyDashboardStats() {
  const response =
    await api.get<MyDashboardStatsResponse>(
      "/stats/me/dashboard",
    );

  return response.data;
}

export async function getSupervisorDashboardStats() {
  const response =
    await api.get<SupervisorDashboardStatsResponse>(
      "/stats/dashboard",
    );

  return response.data;
}

/**
 * Get per-driver dashboard stats.
 *
 * Returns for every managed driver:
 * - delivered today
 * - delivered this month
 * - first shift start today
 * - last shift finish today
 * - total worked time today
 * - working now
 */
export async function getSupervisorDriversDashboard() {
  const response =
    await api.get<SupervisorDriversDashboardResponse>(
      "/stats/drivers-dashboard",
    );

  return response.data;
}

export async function getSupervisorRangeStats(
  from: string,
  to: string,
  driverId?: string,
) {
  const response =
    await api.get<SupervisorRangeStatsResponse>(
      "/stats/range",
      {
        params: {
          from,
          to,

          ...(driverId
            ? {
                driverId,
              }
            : {}),
        },
      },
    );

  return response.data;
}

export async function getDriverStats(
  driverId: string,
  period: StatsPeriod = "today",
) {
  const response =
    await api.get<DriverStatsResponse>(
      `/stats/drivers/${driverId}`,
      {
        params: {
          period,
        },
      },
    );

  return response.data;
}