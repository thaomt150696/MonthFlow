// Date helpers. Dates are local; stored as "YYYY-MM-DD". Weeks start on Monday.
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function startOfWeek(d) {
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(d, -offset);
}

export function weekDays(d) {
  const start = startOfWeek(d);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isWeekend(d) {
  return d.getDay() === 0 || d.getDay() === 6;
}

// All days shown in a month grid: from the Monday on/before the 1st to the Sunday on/after the last day.
export function monthGridDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(last), 6);
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return { year: t.getUTCFullYear(), week: Math.ceil(((t - yearStart) / 86400000 + 1) / 7) };
}

// "2026-W42": the key Weekly Focus is stored under.
export function weekKey(d) {
  const { year, week } = isoWeek(d);
  return year + "-W" + String(week).padStart(2, "0");
}

// "19 Oct"
export function fmtDayMonth(iso) {
  const d = fromISO(iso);
  return d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
}

// "Mon 19 Oct"
export function fmtShort(iso) {
  const d = fromISO(iso);
  return DAY_NAMES[d.getDay()] + " " + d.getDate() + " " + MONTHS_SHORT[d.getMonth()];
}

// "Mon 19 Oct 2026"
export function fmtLong(iso) {
  return fmtShort(iso) + " " + fromISO(iso).getFullYear();
}

export function dayName(d) {
  return DAY_NAMES[d.getDay()];
}

// "12 – 18 Oct" or "28 Sep – 4 Oct"
export function weekRangeLabel(start) {
  const end = addDays(start, 6);
  return start.getMonth() === end.getMonth()
    ? start.getDate() + " – " + end.getDate() + " " + MONTHS_SHORT[end.getMonth()]
    : start.getDate() + " " + MONTHS_SHORT[start.getMonth()] + " – " + end.getDate() + " " + MONTHS_SHORT[end.getMonth()];
}
