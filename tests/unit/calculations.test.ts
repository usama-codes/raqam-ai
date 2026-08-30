import { describe, it, expect } from "vitest";
import {
  calculateBalance,
  calculateSavingsRate,
  calculateBudgetUtilization,
  calculateDailyExpenseAverage,
  calculateDaysRemainingInMonth,
  detectCategoryAnomalies,
  goalCompletionDate,
  canAfford,
} from "@/lib/finance/calculations";

// Deterministic finance math — verified against hand computation (AGENTS.md §13).

describe("calculateBalance", () => {
  it("nets income against expenses", () => {
    expect(
      calculateBalance([
        { type: "income", amount: 5000 },
        { type: "expense", amount: 1200 },
        { type: "expense", amount: 800 },
      ]),
    ).toBe(3000);
  });

  it("is 0 for no transactions", () => {
    expect(calculateBalance([])).toBe(0);
  });
});

describe("calculateSavingsRate", () => {
  it("returns 0 when income is 0", () => {
    expect(calculateSavingsRate(0, 100)).toBe(0);
  });

  it("computes (income - expenses) / income * 100", () => {
    expect(calculateSavingsRate(1000, 750)).toBeCloseTo(25);
  });

  it("goes negative when overspending", () => {
    expect(calculateSavingsRate(1000, 1200)).toBeCloseTo(-20);
  });
});

describe("calculateBudgetUtilization", () => {
  it("returns 0 when limit is 0", () => {
    expect(calculateBudgetUtilization(500, 0)).toBe(0);
  });

  it("returns the percent spent", () => {
    expect(calculateBudgetUtilization(900, 1000)).toBe(90);
    expect(calculateBudgetUtilization(1500, 1000)).toBe(150);
  });
});

describe("projection helpers", () => {
  it("daily average guards against zero elapsed days", () => {
    expect(calculateDailyExpenseAverage(3000, 0)).toBe(0);
    expect(calculateDailyExpenseAverage(3000, 10)).toBe(300);
  });

  it("days remaining never goes negative", () => {
    expect(calculateDaysRemainingInMonth(20, 30)).toBe(10);
    expect(calculateDaysRemainingInMonth(35, 30)).toBe(0);
  });
});

describe("detectCategoryAnomalies", () => {
  it("flags categories at or above 30% over their rolling average", () => {
    const out = detectCategoryAnomalies([
      { name: "food", nameUr: "کھانا", average: 5000, currentSpend: 7000 }, // +40%
      { name: "transport", nameUr: "سفر", average: 3000, currentSpend: 3200 }, // +6.7%
      { name: "new", nameUr: "نیا", average: 0, currentSpend: 1000 }, // no baseline
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("food");
    expect(out[0].deviationPercent).toBe(40);
  });

  it("returns an empty array when nothing deviates", () => {
    expect(
      detectCategoryAnomalies([
        { name: "food", nameUr: "کھانا", average: 5000, currentSpend: 5100 },
      ]),
    ).toEqual([]);
  });
});

describe("goalCompletionDate", () => {
  it("returns null when monthly savings is non-positive", () => {
    expect(goalCompletionDate(100_000, 20_000, 0)).toBeNull();
    expect(goalCompletionDate(100_000, 20_000, -500)).toBeNull();
  });

  it("returns today's date when the goal is already met", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(goalCompletionDate(100_000, 100_000, 5_000)).toBe(today);
  });

  it("projects a future ISO date otherwise", () => {
    const d = goalCompletionDate(100_000, 40_000, 20_000); // 3 months out
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("canAfford", () => {
  it("is affordable when the projected month-end covers the purchase", () => {
    const r = canAfford(5_000, 50_000, 30_000, 20_000);
    expect(r.affordable).toBe(true);
    expect(r.currentNetSavings).toBe(20_000);
    expect(r.impactPercent).toBe(10);
  });

  it("is not affordable when it would push the month negative", () => {
    expect(canAfford(25_000, 50_000, 30_000, 20_000).affordable).toBe(false);
  });
});
