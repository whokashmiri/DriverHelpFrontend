export function secondsToHours(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return seconds / 3600;
}

export function formatDuration(seconds: number, locale: "ar" | "en" = "ar") {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return locale === "ar" ? "0 دقيقة" : "0 min";
  }

  const totalSeconds = Math.floor(seconds);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours <= 0) {
    return locale === "ar" ? `${minutes} دقيقة` : `${minutes} min`;
  }

  if (minutes <= 0) {
    return locale === "ar" ? `${hours} ساعة` : `${hours} hr`;
  }

  return locale === "ar"
    ? `${hours} ساعة ${minutes} دقيقة`
    : `${hours} hr ${minutes} min`;
}

export function formatDurationShort(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const secs = totalSeconds % 60;

  return [hours, minutes, secs]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

/**
 * Useful for active shift timer.
 */
export function getElapsedSeconds(
  startedAt: string | Date,
  endedAt?: string | Date | null,
) {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);

  const end = endedAt
    ? endedAt instanceof Date
      ? endedAt
      : new Date(endedAt)
    : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}
