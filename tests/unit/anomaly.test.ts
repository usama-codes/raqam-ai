import { describe, it, expect } from "vitest";
import { isAnomaly, deviationFromAverage } from "@/lib/finance/anomaly";

// Deterministic anomaly rules — verified against hand computation (AGENTS.md §13).
// AGENTS.md §13: "anomaly detected when category is 30%+ above rolling average".

describe("isAnomaly", () => {
  it("is false when there is no baseline (rolling average 0)", () => {
    expect(isAnomaly(1000, 0)).toBe(false);
  });

  it("flags spending at exactly 30% over the average", () => {
    expect(isAnomaly(1300, 1000)).toBe(true);
  });

  it("does not flag spending just below the 30% line", () => {
    expect(isAnomaly(1299, 1000)).toBe(false);
  });

  it("does not flag spending below the average", () => {
    expect(isAnomaly(800, 1000)).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(isAnomaly(1200, 1000, 0.1)).toBe(true); // +20% ≥ 10%
    expect(isAnomaly(1200, 1000, 0.5)).toBe(false); // +20% < 50%
  });
});

describe("deviationFromAverage", () => {
  it("returns 0 when there is no baseline", () => {
    expect(deviationFromAverage(500, 0)).toBe(0);
  });

  it("returns the positive percentage over the average", () => {
    expect(deviationFromAverage(1400, 1000)).toBe(40);
  });

  it("returns a negative percentage when under the average", () => {
    expect(deviationFromAverage(700, 1000)).toBe(-30);
  });
});
