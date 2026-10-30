
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  endShift as endShiftApi,
  getActiveShift,
  startShift as startShiftApi,
} from "../api";

import type { DriverShift } from "../types/shift";

import {
  formatDuration,
  formatDurationShort,
  getElapsedSeconds,
  getErrorMessage,
} from "../utils";

export type ShiftLoadStatus = "loading" | "ready" | "error";

export function useShift(locale: "ar" | "en" = "ar") {
  const [activeShift, setActiveShift] = useState<DriverShift | null>(null);

  const [loadStatus, setLoadStatus] =
    useState<ShiftLoadStatus>("loading");

  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  /*
   * Prevent stale API responses from overwriting
   * newer shift data.
   */
  const requestVersionRef = useRef(0);

  /*
   * Synchronous lock prevents repeated taps
   * before React updates isStarting/isEnding.
   */
  const operationRef = useRef<"start" | "end" | null>(null);

  const mountedRef = useRef(false);

  /*
   * LOAD / REFRESH ACTIVE SHIFT
   */
  const loadActiveShift = useCallback(async () => {
    const version = ++requestVersionRef.current;

    if (mountedRef.current) {
      setLoadStatus("loading");
      setError(null);
    }

    try {
      const response = await getActiveShift();
      const shift = response.shift ?? null;

      if (
        mountedRef.current &&
        version === requestVersionRef.current
      ) {
        setActiveShift(shift);
        setElapsedSeconds(
          shift ? getElapsedSeconds(shift.startedAt) : 0,
        );
        setLoadStatus("ready");
      }

      return shift;
    } catch (err) {
      if (
        mountedRef.current &&
        version === requestVersionRef.current
      ) {
        setError(
          getErrorMessage(err, "Unable to load active shift"),
        );

        /*
         * Unknown is not the same as inactive.
         * Keep previous shift data and avoid
         * triggering a background tracking stop.
         */
        setLoadStatus("error");
      }

      throw err;
    }
  }, []);

  /*
   * INITIALIZE
   */
  useEffect(() => {
    mountedRef.current = true;

    /*
     * loadActiveShift can reject, so handle it
     * here to avoid an unhandled rejection.
     */
    void loadActiveShift().catch((err) => {
      console.warn("[Shift] Initialization failed:", err);
    });

    return () => {
      mountedRef.current = false;
      ++requestVersionRef.current;
    };
  }, [loadActiveShift]);

  /*
   * SHIFT TIMER
   */
  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = activeShift.startedAt;

    const updateTimer = () => {
      setElapsedSeconds(getElapsedSeconds(startedAt));
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeShift?.startedAt]);

  /*
   * START SHIFT
   */
  const start = useCallback(async () => {
    if (operationRef.current) {
      throw new Error("Another shift operation is in progress");
    }

    operationRef.current = "start";

    /*
     * Invalidate pending GET responses.
     */
    const version = ++requestVersionRef.current;

    try {
      setIsStarting(true);
      setError(null);

      const response = await startShiftApi();

      if (mountedRef.current && version === requestVersionRef.current) {
        setActiveShift(response.shift);
        setElapsedSeconds(
          getElapsedSeconds(response.shift.startedAt),
        );
        setLoadStatus("ready");
      }

      return response.shift;
    } catch (err) {
      if (mountedRef.current) {
        setError(
          getErrorMessage(err, "Unable to start shift"),
        );
      }

      throw err;
    } finally {
      operationRef.current = null;

      if (mountedRef.current) {
        setIsStarting(false);
      }
    }
  }, []);

  /*
   * END SHIFT
   */
  const end = useCallback(async () => {
    if (operationRef.current) {
      throw new Error("Another shift operation is in progress");
    }

    operationRef.current = "end";

    const version = ++requestVersionRef.current;

    try {
      setIsEnding(true);
      setError(null);

      const response = await endShiftApi();

      /*
       * Only stop tracking after the backend
       * confirms the shift has ended.
       */
      if (mountedRef.current && version === requestVersionRef.current) {
        setActiveShift(null);
        setElapsedSeconds(0);
        setLoadStatus("ready");
      }

      return response.shift;
    } catch (err) {
      if (mountedRef.current) {
        setError(
          getErrorMessage(err, "Unable to end shift"),
        );
      }

      throw err;
    } finally {
      operationRef.current = null;

      if (mountedRef.current) {
        setIsEnding(false);
      }
    }
  }, []);

  const formattedDuration = useMemo(
    () => formatDuration(elapsedSeconds, locale),
    [elapsedSeconds, locale],
  );

  const timer = useMemo(
    () => formatDurationShort(elapsedSeconds),
    [elapsedSeconds],
  );

  return {
    activeShift,

    isWorking: Boolean(activeShift),

    /*
     * A confirmed shift state is required
     * before stopping native tracking.
     */
    loadStatus,
    isLoading: loadStatus === "loading",
    isShiftReady: loadStatus === "ready",

    elapsedSeconds,
    formattedDuration,
    timer,

    isStarting,
    isEnding,
    error,

    startShift: start,
    endShift: end,
    refresh: loadActiveShift,
  };
}
