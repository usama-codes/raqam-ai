// lib/finance/unusual-spend.ts — Unusual-spending detection with noise guards (pure functions)
//
// The raw "30% above the 3-month rolling average" rule (AGENTS.md §13 Phase 13)
// fires constantly on small or sparse categories. These guards keep the alert
// meaningful: a real rupee overspend, in a category the user actually uses.

export interface RollingAverageRow {
  categoryId: string;
  name: string;
  nameUr: string;
  average: number; // 3-month rolling average spend for this category
  currentSpend: number; // current-month spend
  monthsWithSpend: number; // of the last 3 months, how many had spend > 0
}

export interface UnusualSpendFlag {
  categoryId: string;
  name: string;
  nameUr: string;
  average: number;
  currentSpend: number;
  deviationPercent: number; // rounded % above the average
}

export interface UnusualSpendOptions {
  /** Deviation threshold as a fraction. Default 0.3 (30%). */
  threshold?: number;
  /** Ignore categories whose rolling average is below this. Default Rs. 1,000. */
  minAverage?: number;
  /** Ignore overspends smaller than this in absolute rupees. Default Rs. 500. */
  minOverspend?: number;
  /** Require spend in at least this many of the last 3 months. Default 2. */
  minMonths?: number;
  /** Cap the number of flags returned. Default 2. */
  max?: number;
}

/**
 * Flag categories spending anomalously above their rolling average, applying
 * absolute-floor and history guards. Sorted by deviation descending, capped.
 */
export function flagUnusualSpending(
  rows: RollingAverageRow[],
  opts: UnusualSpendOptions = {},
): UnusualSpendFlag[] {
  const {
    threshold = 0.3,
    minAverage = 1000,
    minOverspend = 500,
    minMonths = 2,
    max = 2,
  } = opts;

  const flags: UnusualSpendFlag[] = [];

  for (const row of rows) {
    if (row.average < minAverage) continue;
    if (row.monthsWithSpend < minMonths) continue;

    const overspend = row.currentSpend - row.average;
    if (overspend < minOverspend) continue;

    const deviation = overspend / row.average;
    if (deviation < threshold) continue;

    flags.push({
      categoryId: row.categoryId,
      name: row.name,
      nameUr: row.nameUr,
      average: Math.round(row.average),
      currentSpend: Math.round(row.currentSpend),
      deviationPercent: Math.round(deviation * 100),
    });
  }

  flags.sort((a, b) => b.deviationPercent - a.deviationPercent);
  return flags.slice(0, max);
}
