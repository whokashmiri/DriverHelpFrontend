export function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

export function isValidDate(value: string | Date) {
  const date = toDate(value);

  return !Number.isNaN(date.getTime());
}

export function formatDate(value: string | Date, locale: "ar" | "en" = "ar") {
  const date = toDate(value);

  if (!isValidDate(date)) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(value: string | Date, locale: "ar" | "en" = "ar") {
  const date = toDate(value);

  if (!isValidDate(date)) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(
  value: string | Date,
  locale: "ar" | "en" = "ar",
) {
  const date = toDate(value);

  if (!isValidDate(date)) {
    return "-";
  }

  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",

    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Useful for "last updated" / location timestamps.
 */
export function getTimeAgo(value: string | Date, locale: "ar" | "en" = "ar") {
  const date = toDate(value);

  if (!isValidDate(date)) {
    return "-";
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 0) {
    return formatDateTime(date, locale);
  }

  if (seconds < 60) {
    return locale === "ar" ? "الآن" : "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return locale === "ar" ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return locale === "ar" ? `منذ ${hours} ساعة` : `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return locale === "ar" ? `منذ ${days} يوم` : `${days} days ago`;
  }

  return formatDate(date, locale);
}
