// lib/notifications/messages.ts — Urdu-first SMS alert message builders.
//
// All templates live in lib/i18n/ur.ts (with English fallbacks in en.ts) as flat
// dot-notation keys with {placeholder} holes, per the project's i18n structure
// (AGENTS.md §5). This module fills those holes with real figures and produces
// the final message text — deterministic and unit-tested in
// tests/unit/notifications.test.ts.
//
// Voice: layman-friendly Urdu. No percentages, no jargon — thresholds are
// expressed through everyday analogies (a nearly finished plate of biryani, the
// last sip of chai). Amounts arrive as plain rupee figures (P1, P5).

import { ur } from "@/lib/i18n/ur";
import { en } from "@/lib/i18n/en";

export type NotificationKind =
  | "budget_approaching"
  | "budget_reached"
  | "bill_due"
  | "monthly_summary"
  | "test";

// ─── Placeholder filling ───────────────────────────────────────────────────────

/** Replace every {placeholder} in a template with its param value. */
export function fillTemplate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Urdu month names as commonly used in Pakistan (deterministic, no ICU). */
const URDU_MONTHS = [
  "جنوری",
  "فروری",
  "مارچ",
  "اپریل",
  "مئی",
  "جون",
  "جولائی",
  "اگست",
  "ستمبر",
  "اکتوبر",
  "نومبر",
  "دسمبر",
];

/** "1,200" — grouped digits, no decimals (rupees never need cents here). */
export function formatRupees(amount: number): string {
  return Math.round(amount).toLocaleString("en-PK");
}

/** "اگست" — Urdu month name for a timestamp. */
export function urduMonthName(timestampMs: number): string {
  return URDU_MONTHS[new Date(timestampMs).getUTCMonth()] ?? "";
}

/** "5 اگست" — Urdu day + month for a timestamp (dates are stored as UTC ms). */
export function urduDayMonth(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getUTCDate()} ${urduMonthName(timestampMs)}`;
}

/**
 * Whole days from now until the due date, always rounded up (a bill due in 30
 * hours still counts as 2 days away). Negative = overdue; the bill builder
 * clamps those to at least 1 so late reminders still read sensibly.
 */
export function daysUntil(dueTimestampMs: number, nowMs: number): number {
  return Math.ceil((dueTimestampMs - nowMs) / (24 * 60 * 60 * 1000));
}

function dict(lang: "ur" | "en") {
  return lang === "en" ? en : ur;
}

// ─── Message builders ─────────────────────────────────────────────────────────

export interface BudgetApproachingParams {
  lang?: "ur" | "en";
  categoryNameUr: string;
  spent: number;
  remaining: number;
}

/** ≥ 80% of a category budget — the "nearly finished plate" alert. */
export function buildBudgetApproachingMessage(
  params: BudgetApproachingParams,
): string {
  const { lang = "ur" } = params;
  return fillTemplate(dict(lang)["notifications.budgetApproaching"], {
    category: params.categoryNameUr,
    spent: formatRupees(params.spent),
    remaining: formatRupees(params.remaining),
  });
}

export interface BudgetReachedParams {
  lang?: "ur" | "en";
  categoryNameUr: string;
  spent: number;
  limit: number;
}

/** ≥ 100% of a category budget — the "plate is clean" alert. */
export function buildBudgetReachedMessage(params: BudgetReachedParams): string {
  const { lang = "ur" } = params;
  return fillTemplate(dict(lang)["notifications.budgetReached"], {
    category: params.categoryNameUr,
    spent: formatRupees(params.spent),
    limit: formatRupees(params.limit),
  });
}

export interface BillDueParams {
  lang?: "ur" | "en";
  billName: string;
  dueTimestampMs: number;
  amount: number;
  nowMs?: number;
}

/** Recurring bill due within the reminder window (3–7 days). */
export function buildBillDueMessage(params: BillDueParams): string {
  const { lang = "ur" } = params;
  const now = params.nowMs ?? Date.now();
  const days = daysUntil(params.dueTimestampMs, now);
  return fillTemplate(dict(lang)["notifications.billDue"], {
    bill: params.billName,
    date: urduDayMonth(params.dueTimestampMs),
    days: days > 0 ? days : 1,
    amount: formatRupees(params.amount),
  });
}

export interface MonthlySummaryParams {
  lang?: "ur" | "en";
  /** First-of-month timestamp of the month being summarized. */
  monthTimestampMs: number;
  income: number;
  expenses: number;
  savings: number;
}

/** Previous month's recap, sent on the 1st. Savings can be negative. */
export function buildMonthlySummaryMessage(
  params: MonthlySummaryParams,
): string {
  const { lang = "ur" } = params;
  const d = dict(lang);
  const advice =
    params.savings > 0
      ? d["notifications.monthlyAdvicePositive"]
      : d["notifications.monthlyAdviceNegative"];
  return fillTemplate(d["notifications.monthlySummary"], {
    month: urduMonthName(params.monthTimestampMs),
    income: formatRupees(params.income),
    expenses: formatRupees(params.expenses),
    savings: formatRupees(Math.abs(params.savings)),
    advice,
  });
}

/** Settings-page "send test message" — confirms the opt-in works end to end. */
export function buildTestMessage(lang: "ur" | "en" = "ur"): string {
  return dict(lang)["notifications.test"];
}

// ─── Dedup keys ───────────────────────────────────────────────────────────────
// One alert per key: a budget tier fires once per category per month, a bill
// reminder once per due date, the summary once per month.

export function budgetDedupKey(
  kind: "budget_approaching" | "budget_reached",
  categoryId: string,
  monthTimestampMs: number,
): string {
  return `${kind}:${categoryId}:${monthTimestampMs}`;
}

export function billDedupKey(
  recurringExpenseId: string,
  dueTimestampMs: number,
): string {
  return `bill_due:${recurringExpenseId}:${dueTimestampMs}`;
}

export function monthlySummaryDedupKey(monthTimestampMs: number): string {
  return `monthly_summary:${monthTimestampMs}`;
}
