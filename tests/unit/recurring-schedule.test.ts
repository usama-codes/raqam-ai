import { describe, it, expect } from "vitest";
import {
  advanceDueDate,
  daysInMonth,
  nextFutureDueDate,
} from "@/lib/finance/recurring-schedule";

// Local-midnight helper so assertions read as calendar dates.
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day).getTime();
const iso = (ms: number) => {
  const x = new Date(ms);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate(),
  ).padStart(2, "0")}`;
};

describe("daysInMonth", () => {
  it("knows month lengths, including leap February", () => {
    expect(daysInMonth(2026, 0)).toBe(31); // Jan
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026 (non-leap)
    expect(daysInMonth(2028, 1)).toBe(29); // Feb 2028 (leap)
    expect(daysInMonth(2026, 8)).toBe(30); // Sep
  });
});

describe("advanceDueDate", () => {
  it("daily adds one day, across a month boundary", () => {
    expect(iso(advanceDueDate(d(2026, 1, 31), "daily"))).toBe("2026-02-01");
  });

  it("weekly adds seven days", () => {
    expect(iso(advanceDueDate(d(2026, 1, 28), "weekly"))).toBe("2026-02-04");
  });

  it("monthly keeps the day-of-month when it exists", () => {
    expect(iso(advanceDueDate(d(2026, 1, 15), "monthly"))).toBe("2026-02-15");
  });

  it("monthly clamps Jan 31 to end of February", () => {
    expect(iso(advanceDueDate(d(2026, 1, 31), "monthly"))).toBe("2026-02-28");
    expect(iso(advanceDueDate(d(2028, 1, 31), "monthly"))).toBe("2028-02-29");
  });

  it("monthly clamps Aug 31 to Sep 30", () => {
    expect(iso(advanceDueDate(d(2026, 8, 31), "monthly"))).toBe("2026-09-30");
  });

  it("monthly rolls December into next January", () => {
    expect(iso(advanceDueDate(d(2026, 12, 10), "monthly"))).toBe("2027-01-10");
  });

  it("yearly adds one year, clamping Feb 29", () => {
    expect(iso(advanceDueDate(d(2028, 2, 29), "yearly"))).toBe("2029-02-28");
    expect(iso(advanceDueDate(d(2026, 6, 1), "yearly"))).toBe("2027-06-01");
  });
});

describe("nextFutureDueDate", () => {
  it("rolls a stale monthly date forward past now", () => {
    const now = d(2026, 5, 20);
    const out = nextFutureDueDate(d(2026, 1, 5), "monthly", now);
    expect(iso(out)).toBe("2026-06-05");
    expect(out).toBeGreaterThan(now);
  });

  it("leaves an already-future date untouched", () => {
    const now = d(2026, 5, 20);
    const future = d(2026, 6, 1);
    expect(nextFutureDueDate(future, "monthly", now)).toBe(future);
  });
});
