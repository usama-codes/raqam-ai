import { describe, it, expect } from "vitest";
import {
  projectEndOfMonth,
  whatIfScenario,
  monthsToGoal,
} from "@/lib/finance/projections";

// Deterministic projection math — verified against hand computation (AGENTS.md §13:
// "projection accuracy within 5% of known values"; here the math is exact).

describe("projectEndOfMonth", () => {
  it("subtracts projected remaining spend from the current balance", () => {
    expect(projectEndOfMonth(50_000, 1_200, 10)).toBe(38_000);
  });

  it("returns the current balance when no days remain", () => {
    expect(projectEndOfMonth(50_000, 1_200, 0)).toBe(50_000);
  });

  it("can project a negative end-of-month balance", () => {
    expect(projectEndOfMonth(5_000, 1_000, 10)).toBe(-5_000);
  });
});

describe("whatIfScenario", () => {
  it("reduces total expenses by the saved fraction of the category", () => {
    expect(whatIfScenario(40_000, 8_000, 30)).toBe(37_600);
  });

  it("is a no-op at 0% reduction", () => {
    expect(whatIfScenario(40_000, 8_000, 0)).toBe(40_000);
  });

  it("removes the whole category at 100% reduction", () => {
    expect(whatIfScenario(40_000, 8_000, 100)).toBe(32_000);
  });
});

describe("monthsToGoal", () => {
  it("is Infinity when monthly savings is non-positive", () => {
    expect(monthsToGoal(100_000, 40_000, 0)).toBe(Infinity);
    expect(monthsToGoal(100_000, 40_000, -500)).toBe(Infinity);
  });

  it("is 0 when the goal is already met or exceeded", () => {
    expect(monthsToGoal(100_000, 100_000, 5_000)).toBe(0);
    expect(monthsToGoal(100_000, 120_000, 5_000)).toBe(0);
  });

  it("rounds the remaining months up", () => {
    expect(monthsToGoal(100_000, 40_000, 20_000)).toBe(3); // 60k / 20k
    expect(monthsToGoal(100_000, 0, 30_000)).toBe(4); // 100k / 30k → 3.33 → 4
  });
});
