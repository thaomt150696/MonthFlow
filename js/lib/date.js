// Date helpers. Dates are local; stored as "YYYY-MM-DD". Weeks start on Monday.
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
