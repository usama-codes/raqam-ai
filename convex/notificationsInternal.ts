// convex/notificationsInternal.ts — internal data access for the SMS
// notification pipeline.
//
// Every function here is *internal* (internalQuery / internalMutation): it can
// only be invoked from other Convex functions, never from the client. The daily
// cron must read opted-in users' phone numbers and spending data across all
// users — cross-user reads like that must never become a public endpoint (§8).
//
// The node actions in convex/notifications.ts reach these via
// `ctx.runQuery(internal.notificationsInternal.…)`.

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─── Settings ──────────────────────────────────────────────────────────────────

export interface DeliverySettings {
  smsEnabled: boolean;
  smsPhone: string | null;
  budgetApproaching: boolean;
  budgetReached: boolean;
  billReminders: boolean;
  monthlySummary: boolean;
  unusualSpend: boolean;
  preferredLanguage: "ur" | "en";
}

const DEFAULT_SETTINGS: DeliverySettings = {
  smsEnabled: false,
  smsPhone: null,
  budgetApproaching: false,
  budgetReached: false,
  billReminders: false,
  monthlySummary: false,
  unusualSpend: false,
  preferredLanguage: "ur",
};

/**
 * Consent record + preferred language for one user. Defaults (everything off)
 * when the user never saved settings — the action layer then no-ops.
 */
export const getSettings = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<DeliverySettings> => {
    const [settings, user] = await Promise.all([
      ctx.db
        .query("notificationSettings")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first(),
      ctx.db.get(args.userId),
    ]);

    if (!settings) {
      return {
        ...DEFAULT_SETTINGS,
        preferredLanguage: user?.preferredLanguage ?? "ur",
      };
    }

    return {
      smsEnabled: settings.smsEnabled,
      smsPhone: settings.smsPhone ?? null,
      budgetApproaching: settings.budgetApproaching,
      budgetReached: settings.budgetReached,
      billReminders: settings.billReminders,
      monthlySummary: settings.monthlySummary,
      unusualSpend: settings.unusualSpend,
      preferredLanguage: user?.preferredLanguage ?? "ur",
    };
  },
});

export interface OptedInUser {
  userId: Id<"users">;
  smsPhone: string;
  budgetApproaching: boolean;
  budgetReached: boolean;
  billReminders: boolean;
  monthlySummary: boolean;
  preferredLanguage: "ur" | "en";
}

/**
 * All users who opted into SMS alerts (master switch on + phone stored).
 * Used by the daily cron — the only place cross-user delivery happens.
 */
export const listOptedInUsers = internalQuery({
  args: {},
  handler: async (ctx): Promise<OptedInUser[]> => {
    const allSettings = await ctx.db.query("notificationSettings").collect();

    const optedIn: OptedInUser[] = [];
    for (const s of allSettings) {
      if (!s.smsEnabled || !s.smsPhone) continue;

      const user = await ctx.db.get(s.userId);
      if (!user) continue;

      optedIn.push({
        userId: s.userId,
        smsPhone: s.smsPhone,
        budgetApproaching: s.budgetApproaching,
        budgetReached: s.budgetReached,
        billReminders: s.billReminders,
        monthlySummary: s.monthlySummary,
        preferredLanguage: user.preferredLanguage,
      });
    }
    return optedIn;
  },
});

// ─── Budget status ─────────────────────────────────────────────────────────────

export interface BudgetCategoryStatus {
  categoryId: Id<"categories">;
  categoryNameUr: string;
  limit: number;
  spent: number;
}

export interface BudgetStatus {
  month: number;
  categories: BudgetCategoryStatus[];
}

/**
 * Category-level spent vs limit for the user's most recent budget at or before
 * `now` (spend accumulates across the budget's calendar month). Returns null
 * when the user has no budget at all — nothing to alert on (P2: no invented
 * data).
 */
export const getBudgetStatus = internalQuery({
  args: { userId: v.id("users"), now: v.number() },
  handler: async (ctx, args): Promise<BudgetStatus | null> => {
    const budget = await ctx.db
      .query("budgets")
      .withIndex("by_userId_month", (q) =>
        q.eq("userId", args.userId).lte("month", args.now),
      )
      .order("desc")
      .first();

    if (!budget) return null;

    const monthStart = budget.month;
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const monthEndMs = monthEnd.getTime();

    const budgetCats = await ctx.db
      .query("budgetCategories")
      .withIndex("by_budgetId", (q) => q.eq("budgetId", budget._id))
      .collect();

    const categories: BudgetCategoryStatus[] = [];
    for (const bc of budgetCats) {
      const cat = await ctx.db.get(bc.categoryId);

      const transactions = await ctx.db
        .query("transactions")
        .withIndex("by_userId_category", (q) =>
          q.eq("userId", args.userId).eq("categoryId", bc.categoryId),
        )
        .collect();

      const spent = transactions
        .filter(
          (t) =>
            t.type === "expense" && t.date >= monthStart && t.date < monthEndMs,
        )
        .reduce((sum, t) => sum + t.amount, 0);

      categories.push({
        categoryId: bc.categoryId,
        categoryNameUr: cat?.nameUr ?? "نامعلوم",
        limit: bc.limit,
        spent,
      });
    }

    return { month: budget.month, categories };
  },
});

// ─── Recurring bills ───────────────────────────────────────────────────────────

export interface UpcomingBill {
  recurringExpenseId: Id<"recurringExpenses">;
  description: string;
  amount: number;
  nextDueDate: number;
}

/**
 * Active recurring expenses whose next due date falls inside the reminder
 * window [now − 1 day, now + withinDays days]. The one-day look-back still
 * reminds about a bill that came due while nobody was looking, exactly once
 * (dedup is per due date).
 */
export const listUpcomingBills = internalQuery({
  args: { userId: v.id("users"), nowMs: v.number(), withinDays: v.number() },
  handler: async (ctx, args): Promise<UpcomingBill[]> => {
    const fromMs = args.nowMs - 24 * 60 * 60 * 1000;
    const toMs = args.nowMs + args.withinDays * 24 * 60 * 60 * 1000;

    const expenses = await ctx.db
      .query("recurringExpenses")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return expenses
      .filter(
        (e) => e.isActive && e.nextDueDate >= fromMs && e.nextDueDate <= toMs,
      )
      .map((e) => ({
        recurringExpenseId: e._id,
        description: e.description,
        amount: e.amount,
        nextDueDate: e.nextDueDate,
      }));
  },
});

// ─── Monthly summary ───────────────────────────────────────────────────────────

export interface MonthlySummaryData {
  income: number;
  expenses: number;
  savings: number;
}

/**
 * Income/expense totals for [monthStart, monthEnd). Returns null when the user
 * recorded no transactions that month — an empty month gets no summary
 * message (P2: the AI never invents data).
 */
export const getMonthlySummary = internalQuery({
  args: {
    userId: v.id("users"),
    monthStart: v.number(),
    monthEnd: v.number(),
  },
  handler: async (ctx, args): Promise<MonthlySummaryData | null> => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_userId_date", (q) =>
        q
          .eq("userId", args.userId)
          .gte("date", args.monthStart)
          .lt("date", args.monthEnd),
      )
      .collect();

    if (transactions.length === 0) return null;

    let income = 0;
    let expenses = 0;
    for (const t of transactions) {
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    }

    return { income, expenses, savings: income - expenses };
  },
});

// ─── Dedup + delivery log ──────────────────────────────────────────────────────

/**
 * True when this exact alert (dedupKey) already went out successfully — the
 * gate that keeps a given alert from firing twice. Failed attempts do NOT
 * count, so a transient Twilio error retries on the next trigger.
 */
export const wasSent = internalQuery({
  args: { userId: v.id("users"), dedupKey: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const log = await ctx.db
      .query("notificationLog")
      .withIndex("by_userId_dedupKey", (q) =>
        q.eq("userId", args.userId).eq("dedupKey", args.dedupKey),
      )
      .filter((q) => q.eq(q.field("status"), "sent"))
      .first();
    return log !== null;
  },
});

/**
 * Record one delivery attempt (sent / failed / skipped) in the audit log.
 */
export const logNotification = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.union(
      v.literal("budget_approaching"),
      v.literal("budget_reached"),
      v.literal("bill_due"),
      v.literal("monthly_summary"),
      v.literal("test"),
    ),
    dedupKey: v.string(),
    body: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLog", {
      userId: args.userId,
      channel: "sms",
      kind: args.kind,
      dedupKey: args.dedupKey,
      body: args.body,
      status: args.status,
      errorMessage: args.errorMessage,
      sentAt: Date.now(),
    });
  },
});
