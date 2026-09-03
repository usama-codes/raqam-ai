"use node";

// convex/notifications.ts — Node.js Convex action that pushes proactive
// alerts (convex/proactive.ts) out as email + SMS.
//
// Runs in the Convex Node runtime ("use node") so `nodemailer` and the AWS
// SDK work without shims. Node actions cannot touch `ctx.db` directly — all
// reads/writes go through `ctx.runQuery` / `ctx.runMutation` against
// `internal.proactive.*` / `internal.users.*`.
//
// Triggered hourly by convex/crons.ts. Not exposed to the client.

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendAlertEmail } from "@/lib/notifications/email";
import { sendAlertSms } from "@/lib/notifications/sms";
import { buildNotificationCandidates } from "@/lib/notifications/templates";

export const runAlertSweep = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(
      internal.users.listUsersForNotificationSweep,
      {},
    );

    for (const user of users) {
      const alerts = await ctx.runQuery(internal.proactive.getAlertsForUser, {
        userId: user._id,
      });
      const sentKeys = new Set(
        await ctx.runQuery(internal.proactive.getSentNotificationKeys, {
          userId: user._id,
        }),
      );

      const candidates = buildNotificationCandidates(
        alerts,
        user.preferredLanguage,
      );

      for (const candidate of candidates) {
        const key = `${candidate.alertKey}:${candidate.periodKey}`;
        if (sentKeys.has(key)) continue;

        const channels: Array<"email" | "sms"> = [];

        if (user.email) {
          try {
            await sendAlertEmail(
              user.email,
              candidate.email.subject,
              candidate.email.text,
            );
            channels.push("email");
          } catch (err) {
            console.error(
              `[notifications] email failed for user ${user._id} (${candidate.alertKey}):`,
              err,
            );
          }
        }

        if (user.phone) {
          try {
            await sendAlertSms(user.phone, candidate.sms.text);
            channels.push("sms");
          } catch (err) {
            console.error(
              `[notifications] SMS failed for user ${user._id} (${candidate.alertKey}):`,
              err,
            );
          }
        }

        // Only record success — an unsent channel retries on the next sweep
        // rather than being silently dropped for the rest of the period.
        if (channels.length > 0) {
          await ctx.runMutation(internal.proactive.recordNotificationSent, {
            userId: user._id,
            alertKey: candidate.alertKey,
            periodKey: candidate.periodKey,
            channels,
          });
        }
      }
    }
  },
});
