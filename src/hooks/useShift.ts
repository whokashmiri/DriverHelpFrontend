import { useCallback, useEffect, useMemo, useState } from "react";

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

export function useShift(locale: "ar" | "en" = "ar") {
  const [activeShift, setActiveShift] = useState<DriverShift | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isStarting, setIsStarting] = useState(false);

  const [isEnding, setIsEnding] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadActiveShift = useCallback(async () => {
    try {
      setError(null);

      const response = await getActiveShift();

      setActiveShift(response.shift);

      if (response.shift) {
        setElapsedSeconds(getElapsedSeconds(response.shift.startedAt));
      } else {
        setElapsedSeconds(0);
      }

      return response.shift;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load active shift"));

      throw err;
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        await loadActiveShift();
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [loadActiveShift]);

  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);

      return;
    }

    setElapsedSeconds(getElapsedSeconds(activeShift.startedAt));

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds(activeShift.startedAt));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [activeShift]);

  const start = useCallback(async () => {
    try {
      setIsStarting(true);
      setError(null);

      const response = await startShiftApi();

      setActiveShift(response.shift);

      setElapsedSeconds(getElapsedSeconds(response.shift.startedAt));

      return response.shift;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to start shift"));

      throw err;
    } finally {
      setIsStarting(false);
    }
  }, []);

  const end = useCallback(async () => {
    try {
      setIsEnding(true);
      setError(null);

      const response = await endShiftApi();

      setActiveShift(null);
      setElapsedSeconds(0);

      return response.shift;
    } catch (err) {
      setError(getErrorMessage(err, "Unable to end shift"));

      throw err;
    } finally {
      setIsEnding(false);
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

    elapsedSeconds,
    formattedDuration,
    timer,

    isLoading,
    isStarting,
    isEnding,

    error,

    startShift: start,
    endShift: end,

    refresh: loadActiveShift,
  };
}
