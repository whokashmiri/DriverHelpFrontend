export type StatsPeriod = "today" | "week" | "month";

export interface OrderStats {
  total: number;

  pickedUp: number;

  delivered: number;

  cancelled: number;
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

/*
 * =========================================================
 * DRIVER STATS
 * =========================================================
 */

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

/*
 * =========================================================
 * SUPERVISOR TEAM DASHBOARD
 * =========================================================
 */

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

/*
 * =========================================================
 * SUPERVISOR PER-DRIVER DASHBOARD
 * =========================================================
 */

export interface SupervisorDashboardDriver {
  _id: string;

  name: string;

    profilePicture?: {
    url: string;

    publicId?: string | null;
  } | null;

  shortName?: string | null;

  iqamaId: string;

  phone?: string | null;

  isActive: boolean;

  lastLoginAt?: string | null;

  canDeliverOrders?: boolean;
}

export interface SupervisorDashboardDriverOrders {
  deliveredToday: number;

  deliveredThisMonth: number;
}

export interface SupervisorDashboardDriverWork {
  firstShiftStartedAt: string | null;

  lastShiftEndedAt: string | null;

  totalSeconds: number;

  totalHours: number;

  workingNow: boolean;
}

export interface SupervisorDashboardDriverItem {
  driver: SupervisorDashboardDriver;

  orders: SupervisorDashboardDriverOrders;

  todayWork: SupervisorDashboardDriverWork;
}

export interface SupervisorDriversDashboardRange {
  today: {
    start: string;

    end: string;
  };

  month: {
    start: string;

    end: string;
  };
}

export interface SupervisorDriversDashboardResponse {
  success: boolean;

  timezone: string;

  range: SupervisorDriversDashboardRange;

  count: number;

  drivers: SupervisorDashboardDriverItem[];
}

/*
 * =========================================================
 * SINGLE DRIVER STATS
 * =========================================================
 */

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

/*
 * =========================================================
 * SUPERVISOR CUSTOM RANGE
 * =========================================================
 */

export interface SupervisorRangeDriver {
  _id: string;

  name: string;

  iqamaId: string;

  phone?: string | null;

  isActive: boolean;

  lastLoginAt?: string | null;

  role?: "driver" | "supervisor";

  canDeliverOrders?: boolean;
}

export interface SupervisorTeamRangeSummary {
  mode: "team";

  total: number;

  active: number;

  inactive: number;

  workingNow: number;
}

export interface SupervisorDriverRangeSummary {
  mode: "driver";

  driver: SupervisorRangeDriver;

  isSupervisorSelf?: boolean;

  workingNow: boolean;
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

  drivers: SupervisorTeamRangeSummary | SupervisorDriverRangeSummary;

  orders: OrderStats;

  work: {
    totalSeconds: number;

    totalHours: number;
  };
}
