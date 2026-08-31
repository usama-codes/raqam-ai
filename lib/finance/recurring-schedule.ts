// lib/finance/recurring-schedule.ts — Recurring-expense due-date scheduling (pure functions)
//
// Operates on local-midnight semantics so the advanced date lines up with the
// manual-entry date convention used elsewhere in the app.

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Number of days in a given calendar month.
 * @param year  full year
 * @param monthIndex 0-11
 */
export function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of the next month === last day of this month.
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Advance a due date by one interval of the given frequency.
 *
 * - `daily`   → +1 day
 * - `weekly`  → +7 days
 * - `monthly` → same day-of-month next month, clamped to that month's last day
 *               (Jan 31 → Feb 28/29, Aug 31 → Sep 30)
 * - `yearly`  → same month/day next year, clamped (Feb 29 → Feb 28 on non-leap years)
 *
 * @param dueDate Unix ms (interpreted at local time)
 * @returns Unix ms for the next occurrence, at local midnight
 */
export function advanceDueDate(dueDate: number, frequency: Frequency): number {
  const d = new Date(dueDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  switch (frequency) {
    case "daily":
      return new Date(year, month, day + 1).getTime();
    case "weekly":
      return new Date(year, month, day + 7).getTime();
    case "monthly": {
      const targetMonthDays = daysInMonth(year, month + 1);
      return new Date(
        year,
        month + 1,
        Math.min(day, targetMonthDays),
      ).getTime();
    }
    case "yearly": {
      const targetMonthDays = daysInMonth(year + 1, month);
      return new Date(
        year + 1,
        month,
        Math.min(day, targetMonthDays),
      ).getTime();
    }
  }
}

/**
 * Roll a due date forward repeatedly until it is in the future relative to `now`.
 * Guards against an unbounded loop (caps at 500 iterations — ~40 years of monthly).
 */
export function nextFutureDueDate(
  dueDate: number,
  frequency: Frequency,
  now: number = Date.now(),
): number {
  let next = dueDate;
  let guard = 0;
  while (next <= now && guard < 500) {
    next = advanceDueDate(next, frequency);
    guard++;
  }
  return next;
}
