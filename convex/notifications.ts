"use node";

// convex/notifications.ts — Twilio SMS alert delivery (Node.js Convex actions).
//
// Runs in the Node runtime so `fetch` and the lib/notification modules work
// directly. Node actions cannot touch `ctx.db` — every read/write goes through
// the internal functions in convex/notificationsInternal.ts.
//
// Alert policy (user requirement):
//   • budget_approaching — ≥ 80% of a category limit ("plate is nearly finished")
//   • budget_reached     — ≥ 100% of a category limit ("plate is clean")
//   • bill_due           — recurring bill due within the coming week
//   • monthly_summary    — previous month's recap, sent on the first days of a month
//
// Every message is deduped via notificationLog so a given alert fires at most
// once per scope; failures are retried on the next trigger because dedup only
// counts successful sends. Nothing is ever sent without the user's stored
// consent record (§8).

import { action, internalAction, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { sendTwilioSms } from "@/lib/notifications/twilio";
import {
  buildBillDueMessage,
  buildBudgetApproachingMessage,
  buildBudgetReachedMessage,
  buildMonthlySummaryMessage,
  buildTestMessage,
  billDedupKey,
  budgetDedupKey,
  monthlySummaryDedupKey,
  type NotificationKind,
} from "@/lib/notifications/messages";

/** Spending fraction of a category limit that triggers the "approaching" alert. */
const BUDGET_APPROACHING_THRESHOLD = 0.8;
/** Recurring bills are reminded when due within this many days. */
const BILL_REMINDER_WINDOW_DAYS = 7;
/** Days into a month the previous month's summary may still be sent. */
const MONTHLY_SUMMARY_WINDOW_DAYS = 3;

type NotificationLogKind = Exclude<NotificationKind, never>;

interface DeliverArgs {
  userId: string;
  phone: string;
  kind: NotificationLogKind;
  dedupKey: string;
  body: string;
}

/**
 * Shared delivery gate: skip if already sent, call Twilio, log the outcome.
 * Returns true when the message went out.
 */
async function deliver(ctx: ActionCtx, args: DeliverArgs): Promise<boolean> {
  const already = await ctx.runQuery(internal.notificationsInternal.wasSent, {
    userId: args.userId as never,
    dedupKey: args.dedupKey,
  });
  if (already) return false;

  const result = await sendTwilioSms({
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    fromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
    to: args.phone,
    body: args.body,
  });

  await ctx.runMutation(internal.notificationsInternal.logNotification, {
    userId: args.userId as never,
    kind: args.kind,
    dedupKey: args.dedupKey,
    body: args.body,
    status: result.ok ? "sent" : "failed",
    errorMessage: result.error ?? undefined,
  });

  return result.ok;
}

/**
 * Budget alert check for a single user — scheduled after every recorded
 * expense so alerts land within seconds of the triggering transaction
 * (conversational, voice, receipt and manual entry all funnel through
 * mutations that schedule this action).
 */
export const checkBudgetAlerts = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(
      internal.notificationsInternal.getSettings,
      { userId: args.userId },
    );

    if (!settings.smsEnabled || !settings.smsPhone) return;

    await checkBudgetAlertsForUser(ctx, args.userId, settings);
  },
});

async function checkBudgetAlertsForUser(
  ctx: ActionCtx,
  userId: string,
  settings: {
    smsPhone: string | null;
    budgetApproaching: boolean;
    budgetReached: boolean;
    preferredLanguage: "ur" | "en";
  },
): Promise<void> {
  const phone = settings.smsPhone;
  if (!phone) return;

  const status = await ctx.runQuery(
    internal.notificationsInternal.getBudgetStatus,
    { userId: userId as never, now: Date.now() },
  );
  if (!status) return;

  for (const cat of status.categories) {
    const ratio = cat.spent / cat.limit;

    if (ratio >= 1 && settings.budgetReached) {
      await deliver(ctx, {
        userId,
        phone,
        kind: "budget_reached",
        dedupKey: budgetDedupKey(
          "budget_reached",
          cat.categoryId,
          status.month,
        ),
        body: buildBudgetReachedMessage({
          lang: settings.preferredLanguage,
          categoryNameUr: cat.categoryNameUr,
          spent: cat.spent,
          limit: cat.limit,
        }),
      });
    } else if (
      ratio >= BUDGET_APPROACHING_THRESHOLD &&
      settings.budgetApproaching
    ) {
      await deliver(ctx, {
        userId,
        phone,
        kind: "budget_approaching",
        dedupKey: budgetDedupKey(
          "budget_approaching",
          cat.categoryId,
          status.month,
        ),
        body: buildBudgetApproachingMessage({
          lang: settings.preferredLanguage,
          categoryNameUr: cat.categoryNameUr,
          spent: cat.spent,
          remaining: cat.limit - cat.spent,
        }),
      });
    }
  }
}

/**
 * Daily sweep (cron): bill reminders, a budget-alert safety net (catches edits
 * and threshold crossings the event trigger missed), and the previous month's
 * summary during the first days of a new month. Per-user failures never abort
 * the whole run.
 */
export const runDailyChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(
      internal.notificationsInternal.listOptedInUsers,
      {},
    );

    for (const user of users) {
      try {
        // 1. Recurring bills due within the reminder window.
        if (user.billReminders) {
          const bills = await ctx.runQuery(
            internal.notificationsInternal.listUpcomingBills,
            {
              userId: user.userId,
              nowMs: Date.now(),
              withinDays: BILL_REMINDER_WINDOW_DAYS,
            },
          );
          for (const bill of bills) {
            await deliver(ctx, {
              userId: user.userId,
              phone: user.smsPhone,
              kind: "bill_due",
              dedupKey: billDedupKey(bill.recurringExpenseId, bill.nextDueDate),
              body: buildBillDueMessage({
                lang: user.preferredLanguage,
                billName: bill.description,
                dueTimestampMs: bill.nextDueDate,
                amount: bill.amount,
              }),
            });
          }
        }

        // 2. Budget safety net — same tiering as the event-driven check.
        await checkBudgetAlertsForUser(ctx, user.userId, user);

        // 3. Previous month's summary, but only in the first days of a month.
        if (user.monthlySummary) {
          const now = new Date();
          if (now.getUTCDate() <= MONTHLY_SUMMARY_WINDOW_DAYS) {
            const monthStart = Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              1,
            );
            const prevMonthStart = Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth() - 1,
              1,
            );

            const summary = await ctx.runQuery(
              internal.notificationsInternal.getMonthlySummary,
              {
                userId: user.userId,
                monthStart: prevMonthStart,
                monthEnd: monthStart,
              },
            );

            if (summary) {
              await deliver(ctx, {
                userId: user.userId,
                phone: user.smsPhone,
                kind: "monthly_summary",
                dedupKey: monthlySummaryDedupKey(prevMonthStart),
                body: buildMonthlySummaryMessage({
                  lang: user.preferredLanguage,
                  monthTimestampMs: prevMonthStart,
                  income: summary.income,
                  expenses: summary.expenses,
                  savings: summary.savings,
                }),
              });
            }
          }
        }
      } catch (err) {
        // Log to the Convex console; continue with the remaining users.
        console.error(
          `[notifications] daily check failed for user ${user.userId}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  },
});

/**
 * Settings-page "send a test message" — verifies the opt-in end to end.
 * Authentication comes from the caller's Clerk session via getCurrentUser.
 */
export const sendTestMessage = action({
  args: {},
  handler: async (ctx): Promise<{ ok: boolean; error: string | null }> => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) throw new Error("Not authenticated.");

    const settings = await ctx.runQuery(
      internal.notificationsInternal.getSettings,
      { userId: user._id },
    );

    if (!settings.smsEnabled || !settings.smsPhone) {
      return {
        ok: false,
        error:
          "SMS alerts are off — enable them and save a phone number first.",
      };
    }

    const body = buildTestMessage(settings.preferredLanguage);
    const ok = await deliver(ctx, {
      userId: user._id,
      phone: settings.smsPhone,
      kind: "test",
      // Fresh key per test — tests are always allowed through the dedup gate.
      dedupKey: `test:${user._id}:${Date.now()}`,
      body,
    });

    return ok
      ? { ok: true, error: null }
      : {
          ok: false,
          error:
            "Twilio rejected the message — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER and the recipient number.",
        };
  },
});
