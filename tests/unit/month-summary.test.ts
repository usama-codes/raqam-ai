import { describe, it, expect } from "vitest";
import {
  summarizeMonth,
  type SummaryTxn,
  type CategoryMeta,
} from "@/lib/finance/month-summary";

const meta = new Map<string, CategoryMeta>([
  ["food", { name: "food", nameUr: "کھانا", icon: "🍔" }],
  ["rent", { name: "rent", nameUr: "کرایہ", icon: "🏠" }],
  ["transport", { name: "transport", nameUr: "سفر", icon: "🚗" }],
  ["fun", { name: "fun", nameUr: "تفریح", icon: "🎮" }],
]);

const month: SummaryTxn[] = [
  { type: "income", amount: 100_000, categoryId: "salary" },
  { type: "expense", amount: 30_000, categoryId: "rent" },
  { type: "expense", amount: 12_000, categoryId: "food" },
  { type: "expense", amount: 8_000, categoryId: "food" },
  { type: "expense", amount: 5_000, categoryId: "transport" },
  { type: "expense", amount: 3_000, categoryId: "fun" },
];

describe("summarizeMonth", () => {
  it("computes totals, net and savings rate", () => {
    const s = summarizeMonth(month, [], meta);
    expect(s.income).toBe(100_000);
    expect(s.expenses).toBe(58_000);
    expect(s.net).toBe(42_000);
    expect(s.savingsRate).toBe(42);
  });

  it("returns the top 3 expense categories, descending, with food merged", () => {
    const s = summarizeMonth(month, [], meta);
    expect(s.topCategories.map((c) => c.categoryId)).toEqual([
      "rent",
      "food",
      "transport",
    ]);
    expect(s.topCategories[1].amount).toBe(20_000);
    expect(s.topCategories[1].nameUr).toBe("کھانا");
  });

  it("reports the expense delta vs the prior month", () => {
    const prior: SummaryTxn[] = [
      { type: "expense", amount: 40_000, categoryId: "rent" },
    ];
    // 58,000 vs 40,000 => +45%
    expect(summarizeMonth(month, prior, meta).expenseDeltaPct).toBe(45);
  });

  it("returns a null delta when there is no prior expense data", () => {
    expect(summarizeMonth(month, [], meta).expenseDeltaPct).toBeNull();
  });

  it("savings rate is 0 when there is no income", () => {
    const s = summarizeMonth(
      [{ type: "expense", amount: 1_000, categoryId: "food" }],
      [],
      meta,
    );
    expect(s.savingsRate).toBe(0);
    expect(s.net).toBe(-1_000);
  });
});
