// lib/finance/anomaly.ts — Anomaly detection rules (pure functions)

/**
 * Detect if a category's spending is anomalously high compared to a rolling average.
 * An anomaly is flagged when spending is 30%+ above the rolling average.
 *
 * @param currentSpend - Current period spending in a category
 * @param rollingAvg - Rolling average spending for the same category
 * @param threshold - Anomaly threshold (default 0.3 = 30%)
 * @returns true if anomaly detected
 */
export function isAnomaly(
  currentSpend: number,
  rollingAvg: number,
  threshold: number = 0.3,
): boolean {
  if (rollingAvg === 0) return false;
  return (currentSpend - rollingAvg) / rollingAvg >= threshold;
}

/**
 * Get the percentage deviation from the rolling average.
 */
export function deviationFromAverage(
  currentSpend: number,
  rollingAvg: number,
): number {
  if (rollingAvg === 0) return 0;
  return ((currentSpend - rollingAvg) / rollingAvg) * 100;
}
