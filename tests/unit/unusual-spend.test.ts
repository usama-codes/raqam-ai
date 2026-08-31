import { describe, it, expect } from "vitest";
import {
  flagUnusualSpending,
  type RollingAverageRow,
} from "@/lib/finance/unusual-spend";

const row = (over: Partial<RollingAverageRow> = {}): RollingAverageRow => ({
  categoryId: "c1",
  name: "food",
  nameUr: "کھانا",
  average: 5000,
  currentSpend: 7000,
  monthsWithSpend: 3,
  ...over,
});

describe("flagUnusualSpending", () => {
  it("flags a real overspend past all guards", () => {
    const out = flagUnusualSpending([row()]);
    expect(out).toHaveLength(1);
    expect(out[0].deviationPercent).toBe(40);
    expect(out[0].nameUr).toBe("کھانا");
  });

  it("ignores categories below the minimum average", () => {
    expect(
      flagUnusualSpending([
        row({ average: 400, currentSpend: 900, monthsWithSpend: 3 }),
      ]),
    ).toEqual([]);
  });

  it("ignores small absolute overspends even at a high percentage", () => {
    // avg 1200, current 1500 => +25% and +300 rupees: fails minOverspend (500)
    expect(
      flagUnusualSpending([
        row({ average: 1200, currentSpend: 1500, monthsWithSpend: 3 }),
      ]),
    ).toEqual([]);
  });

  it("ignores categories without enough history", () => {
    expect(flagUnusualSpending([row({ monthsWithSpend: 1 })])).toEqual([]);
  });

  it("ignores deviations under the threshold", () => {
    expect(
      flagUnusualSpending([
        row({ average: 5000, currentSpend: 5600, monthsWithSpend: 3 }), // +12%
      ]),
    ).toEqual([]);
  });

  it("sorts by deviation and caps at 2", () => {
    const out = flagUnusualSpending([
      row({ categoryId: "a", average: 5000, currentSpend: 7000 }), // +40%
      row({ categoryId: "b", average: 5000, currentSpend: 9000 }), // +80%
      row({ categoryId: "c", average: 5000, currentSpend: 8000 }), // +60%
    ]);
    expect(out.map((f) => f.categoryId)).toEqual(["b", "c"]);
  });

  it("is safe when average is zero", () => {
    expect(
      flagUnusualSpending([
        row({ average: 0, currentSpend: 3000, monthsWithSpend: 0 }),
      ]),
    ).toEqual([]);
  });
});
