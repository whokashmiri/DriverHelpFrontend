export type StatsPeriod = "today" | "week" | "month";

export interface OrderStats {
  total: number;
  pickedUp: number;
  delivered: number;
}

export interface ActiveShiftSummary {
  id: string;
  startedAt: string;
}

export interface WorkStats {
  totalSeconds: number;
  totalHours: number;

  activeShift?: ActiveShiftSummary | null;
}

export interface PeriodStats {
  orders: OrderStats;
  work: WorkStats;
}

export interface StatsRange {
  start: string;
  end: string;
  timezone?: string;
}

export interface MyStatsResponse {
  success: boolean;

  period: StatsPeriod;

  timezone: string;

  range?: StatsRange;

  orders: OrderStats;

  work: WorkStats;
}

export interface MyDashboardStatsResponse {
  success: boolean;

  timezone: string;

  activeShift?: ActiveShiftSummary | null;

  stats: {
    today: PeriodStats;
    week: PeriodStats;
    month: PeriodStats;
  };
}

export interface SupervisorDashboardStatsResponse {
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
}

export interface DriverStatsResponse {
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
}

export interface SupervisorRangeStatsResponse {
  success: boolean;

  timezone: string;

  scope: "team" | "driver";

  range: {
    from: string;
    to: string;

    start: string;
    end: string;
  };

  drivers:
    | {
        mode: "team";

        total: number;
        active: number;
        inactive: number;
        workingNow: number;
      }
    | {
        mode: "driver";

        driver: {
          _id: string;
          name: string;
          iqamaId: string;
          phone?: string | null;
          isActive: boolean;
          lastLoginAt?: string | null;
        };

        workingNow: boolean;
      };

  orders: {
    total: number;
    pickedUp: number;
    delivered: number;
    cancelled: number;
  };

  work: {
    totalSeconds: number;
    totalHours: number;
  };
}
