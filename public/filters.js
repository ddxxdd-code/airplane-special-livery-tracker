export const DAY_END_MINUTES = 24 * 60;

export function minutesFromLocalTime(value) {
  if (!value) return null;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatMinuteOfDay(value) {
  const minutes = Math.max(0, Math.min(DAY_END_MINUTES, Number(value)));
  if (minutes === DAY_END_MINUTES) return "12:00 AM next day";
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

export function isWithinTimeRange(value, startMinutes, endMinutes) {
  const minutes = minutesFromLocalTime(value);
  if (minutes === null) return false;
  return minutes >= Number(startMinutes) && minutes <= Number(endMinutes);
}
