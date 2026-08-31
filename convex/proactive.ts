// convex/proactive.ts — Derived proactive alerts (Phase 13)
//
// Every alert is computed live, on read, from current data. There is no
// generator and no cron. Dismissals are the only thing persisted: the
// `dismissedAlerts` table holds one row per (alertKey, periodKey) the user has
// dismissed, and the monthly summary uses `users.lastSummaryDismissedMonth`.
//
// AGENTS.md §10 Phase 13. Timezone: month boundaries come from `new Date()` in
// the Convex (UTC) runtime, matching convex/summary.ts.

import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Doc, Id } from "./_generated/dataModel";
import { budgetThresholdSeverity } from "@/lib/finance/calculations";
import {
  flagUnusualSpending,
  type RollingAverageRow,
} from "@/lib/finance/unusual-spend";
import {
  summarizeMonth,
  type CategoryMeta,
  type SummaryTxn,
} from "@/lib/finance/month-summary";

// ─── Preference defaults ───────────────────────────────────────────────────────

type NotificationPrefs = NonNullable<Doc<"users">["notificationPrefs"]>;

const DEFAULT_PREFS: NotificationPrefs = {
  budget80: true,
  budget100: true,
  billReminder: true,
  unusualSpend: true,
  monthlySummary: true,
};

// ─── Date helpers ──────────────────────────────────────────────────────────────

function currentMonthStartMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function shiftMonths(monthStartMs: number, delta: number): number {
  const d = new Date(monthStartMs);
  return new Date(d.getFullYear(), d.getMonth() + delta, 1).getTime();
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// ─── getAlerts ─────────────────────────────────────────────────────────────────

/**
 * All currently-active proactive alerts for the dashboard, minus anything the
 * user has dismissed for the relevant period, and respecting notificationPrefs.
 */
export const getAlerts = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    const prefs = user.notificationPrefs ?? DEFAULT_PREFS;

    const now = Date.now();
    const monthStart = currentMonthStartMs();
    const nextMonthStart = shiftMonths(monthStart, 1);
    const threeMonthsAgo = shiftMonths(monthStart, -3);
    const periodKey = String(monthStart);

    // One transaction sweep covering the 3 prior months + the current month.
    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", user._id)
          .gte("date", threeMonthsAgo)
          .lt("date", nextMonthStart),
      )
      .collect();

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const categoryMap = new Map<Id<"categories">, Doc<"categories">>(
      categories.map((c) => [c._id, c]),
    );

    // Current-month expense by category, and per-month history buckets.
    const currentByCategory = new Map<string, number>();
    const monthlyByCategory = new Map<number, Map<string, number>>();

    for (const t of txns) {
      if (t.type !== "expense") continue;
      if (t.date >= monthStart && t.date < nextMonthStart) {
        currentByCategory.set(
          t.categoryId,
          (currentByCategory.get(t.categoryId) ?? 0) + t.amount,
        );
        continue;
      }
      const d = new Date(t.date);
      const bucket = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      if (!monthlyByCategory.has(bucket)) monthlyByCategory.set(bucket, new Map());
      const m = monthlyByCategory.get(bucket)!;
      m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    }

    // Dismissed (alertKey, periodKey) pairs.
    const dismissed = await ctx.db
      .query("dismissedAlerts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const isDismissed = (alertKey: string, pk: string) =>
      dismissed.some((d) => d.alertKey === alertKey && d.periodKey === pk);

    // ── Budget threshold alerts ──────────────────────────────────────────────
    const budgetAlerts: Array<{
      alertKey: string;
      periodKey: string;
      categoryId: string;
      categoryNameUr: string;
      categoryName: string;
      categoryIcon: string;
      spent: number;
      limit: number;
      pct: number;
      severity: "warning" | "over";
    }> = [];

    if (prefs.budget80 || prefs.budget100) {
      const budget = await ctx.db
        .query("budgets")
        .withIndex("by_userId_month", (q) =>
          q.eq("userId", user._id).eq("month", monthStart),
        )
        .first();

      if (budget) {
        const budgetCats = await ctx.db
          .query("budgetCategories")
          .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
          .collect();

        for (const bc of budgetCats) {
          const severity = budgetThresholdSeverity(
            currentByCategory.get(bc.categoryId) ?? 0,
            bc.limit,
          );
          if (severity === "none") continue;
          if (severity === "over" && !prefs.budget100) continue;
          if (severity === "warning" && !prefs.budget80) continue;

          const spent = currentByCategory.get(bc.categoryId) ?? 0;
          const cat = categoryMap.get(bc.categoryId);
          const alertKey = `${severity === "over" ? "budget100" : "budget80"}:${bc.categoryId}`;
          if (isDismissed(alertKey, periodKey)) continue;

          budgetAlerts.push({
            alertKey,
            periodKey,
            categoryId: bc.categoryId,
            categoryNameUr: cat?.nameUr ?? "نامعلوم",
            categoryName: cat?.name ?? "Unknown",
            categoryIcon: cat?.icon ?? "📦",
            spent,
            limit: bc.limit,
            pct: Math.round((spent / bc.limit) * 100),
            severity,
          });
        }
      }
    }

    // ── Unusual spending alerts ──────────────────────────────────────────────
    let unusualAlerts: Array<{
      alertKey: string;
      periodKey: string;
      categoryId: string;
      categoryNameUr: string;
      categoryName: string;
      categoryIcon: string;
      average: number;
      currentSpend: number;
      deviationPercent: number;
    }> = [];

    if (prefs.unusualSpend) {
      const catIds = new Set<string>();
      for (const m of monthlyByCategory.values())
        for (const id of m.keys()) catIds.add(id);
      for (const id of currentByCategory.keys()) catIds.add(id);

      const rows: RollingAverageRow[] = [];
      for (const catId of catIds) {
        let total = 0;
        let monthsWithSpend = 0;
        for (let i = 1; i <= 3; i++) {
          const bucket = shiftMonths(monthStart, -i);
          const spend = monthlyByCategory.get(bucket)?.get(catId) ?? 0;
          total += spend;
          if (spend > 0) monthsWithSpend++;
        }
        const cat = categoryMap.get(catId as Id<"categories">);
        rows.push({
          categoryId: catId,
          name: cat?.name ?? "Unknown",
          nameUr: cat?.nameUr ?? "نامعلوم",
          average: total / 3,
          currentSpend: currentByCategory.get(catId) ?? 0,
          monthsWithSpend,
        });
      }

      unusualAlerts = flagUnusualSpending(rows)
        .map((f) => {
          const cat = categoryMap.get(f.categoryId as Id<"categories">);
          return {
            alertKey: `anomaly:${f.categoryId}`,
            periodKey,
            categoryId: f.categoryId,
            categoryNameUr: f.nameUr,
            categoryName: f.name,
            categoryIcon: cat?.icon ?? "📦",
            average: f.average,
            currentSpend: f.currentSpend,
            deviationPercent: f.deviationPercent,
          };
        })
        .filter((a) => !isDismissed(a.alertKey, a.periodKey));
    }

    // ── Recurring bill reminders ─────────────────────────────────────────────
    let billReminders: Array<{
      alertKey: string;
      periodKey: string;
      recurringId: string;
      description: string;
      amount: number;
      categoryId: string;
      categoryNameUr: string;
      categoryIcon: string;
      nextDueDate: number;
      overdue: boolean;
    }> = [];

    if (prefs.billReminder) {
      const bills = await ctx.db
        .query("recurringExpenses")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect();

      billReminders = bills
        .filter((b) => b.isActive && b.nextDueDate <= now + THREE_DAYS_MS)
        .map((b) => {
          const cat = categoryMap.get(b.categoryId);
          return {
            alertKey: `bill:${b._id}`,
            periodKey: String(b.nextDueDate),
            recurringId: b._id,
            description: b.description,
            amount: b.amount,
            categoryId: b.categoryId,
            categoryNameUr: cat?.nameUr ?? "نامعلوم",
            categoryIcon: cat?.icon ?? "📦",
            nextDueDate: b.nextDueDate,
            overdue: b.nextDueDate < now,
          };
        })
        .filter((b) => !isDismissed(b.alertKey, b.periodKey))
        .sort((a, b) => a.nextDueDate - b.nextDueDate);
    }

    return { budgetAlerts, unusualAlerts, billReminders };
  },
});

// ─── dismissAlert ──────────────────────────────────────────────────────────────

/** Record a dismissal for the given (alertKey, periodKey). Idempotent. */
export const dismissAlert = mutation({
  args: { alertKey: v.string(), periodKey: v.string() },
  handler: async (
    ctx: MutationCtx,
    args: { alertKey: string; periodKey: string },
  ) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("dismissedAlerts")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) =>
        q.and(
          q.eq(q.field("alertKey"), args.alertKey),
          q.eq(q.field("periodKey"), args.periodKey),
        ),
      )
      .first();

    if (existing) return;

    await ctx.db.insert("dismissedAlerts", {
      userId: user._id,
      alertKey: args.alertKey,
      periodKey: args.periodKey,
      createdAt: Date.now(),
    });
  },
});

// ─── Monthly summary ───────────────────────────────────────────────────────────

/**
 * The "پچھلے مہینے کا خلاصہ" card. `show` is true only on the first visit of a
 * new month (tracked by users.lastSummaryDismissedMonth), when the previous
 * month actually had transactions, and when the pref is on.
 */
export const getMonthlySummary = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    const prefs = user.notificationPrefs ?? DEFAULT_PREFS;

    const monthStart = currentMonthStartMs();
    const prevStart = shiftMonths(monthStart, -1);
    const prevPrevStart = shiftMonths(monthStart, -2);

    const emptyResult = { show: false, summary: null } as const;

    if (!prefs.monthlySummary) return emptyResult;
    if ((user.lastSummaryDismissedMonth ?? 0) >= prevStart) return emptyResult;

    const txns = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", user._id)
          .gte("date", prevPrevStart)
          .lt("date", monthStart),
      )
      .collect();

    const prevMonthTxns = txns.filter((t) => t.date >= prevStart);
    if (prevMonthTxns.length === 0) return emptyResult;
    const priorMonthTxns = txns.filter((t) => t.date < prevStart);

    const categories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const categoryMeta = new Map<string, CategoryMeta>(
      categories.map((c) => [
        c._id,
        { name: c.name, nameUr: c.nameUr, icon: c.icon ?? "📦" },
      ]),
    );

    const toSummaryTxn = (t: Doc<"transactions">): SummaryTxn => ({
      type: t.type,
      amount: t.amount,
      categoryId: t.categoryId,
    });

    const summary = summarizeMonth(
      prevMonthTxns.map(toSummaryTxn),
      priorMonthTxns.map(toSummaryTxn),
      categoryMeta,
    );

    return { show: true, summary: { month: prevStart, ...summary } };
  },
});

/**
 * Dismiss the monthly summary. Writes the current month-start as a high-water
 * mark so the card returns next month, not this one.
 */
export const dismissMonthlySummary = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      lastSummaryDismissedMonth: currentMonthStartMs(),
    });
  },
});
