const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateKey: string, days: number) {
  const next = parseDateKey(dateKey);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

export function diffInDays(fromDateKey: string, toDateKeyValue: string) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKeyValue);
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

export function dateRange(startDateKey: string, endDateKey: string) {
  const days = Math.max(0, diffInDays(startDateKey, endDateKey));
  return Array.from({ length: days + 1 }, (_, index) => addDays(startDateKey, index));
}

export function lastNDays(count: number, endDateKey = toDateKey()) {
  return dateRange(addDays(endDateKey, -(count - 1)), endDateKey);
}

export function isWithinDateRange(dateKey: string, startDateKey: string, endDateKey: string) {
  return diffInDays(startDateKey, dateKey) >= 0 && diffInDays(dateKey, endDateKey) >= 0;
}

export function formatDateTitle(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

export function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

export function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateKey(value);
  return toDateKey(parsed) === value;
}
