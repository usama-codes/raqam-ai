import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import { normalizePakistaniPhone } from "@/lib/notifications/phone";

/**
 * Get the current user's notification settings. Returns sensible defaults
 * (everything off, no phone) when the user has never saved settings — the
 * settings page can render immediately without a write.
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!settings) {
      return {
        smsEnabled: false,
        smsPhone: null,
        budgetApproaching: false,
        budgetReached: false,
        billReminders: false,
        monthlySummary: false,
        unusualSpend: false,
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
    };
  },
});

/**
 * Create or update the current user's notification settings (consent record).
 *
 * Privacy rules (§8):
 * - `smsEnabled` is the master switch; individual toggles are meaningless
 *   while it is off.
 * - Enabling requires a valid Pakistani mobile number, stored in E.164.
 * - The phone can be cleared at any time, which also disables the master
 *   switch server-side so no message can ever be sent without a target.
 */
export const upsert = mutation({
  args: {
    smsEnabled: v.boolean(),
    smsPhone: v.optional(v.string()),
    budgetApproaching: v.boolean(),
    budgetReached: v.boolean(),
    billReminders: v.boolean(),
    monthlySummary: v.boolean(),
    unusualSpend: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const now = Date.now();

    // Normalize / validate the phone number.
    let phone: string | null = null;
    if (args.smsPhone !== undefined && args.smsPhone !== "") {
      const normalized = normalizePakistaniPhone(args.smsPhone);
      if (!normalized) {
        throw new Error(
          "Invalid phone number — enter a Pakistani mobile number, e.g. 03001234567.",
        );
      }
      phone = normalized;
    }

    // Master switch requires a phone; clearing the phone forces the switch off.
    const smsEnabled = args.smsEnabled && phone !== null;

    const existing = await ctx.db
      .query("notificationSettings")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        smsEnabled,
        smsPhone: phone ?? undefined,
        budgetApproaching: args.budgetApproaching,
        budgetReached: args.budgetReached,
        billReminders: args.billReminders,
        monthlySummary: args.monthlySummary,
        unusualSpend: args.unusualSpend ?? existing.unusualSpend,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("notificationSettings", {
      userId: user._id,
      smsEnabled,
      smsPhone: phone ?? undefined,
      budgetApproaching: args.budgetApproaching,
      budgetReached: args.budgetReached,
      billReminders: args.billReminders,
      monthlySummary: args.monthlySummary,
      unusualSpend: args.unusualSpend ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
