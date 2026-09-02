// convex/crons.ts — scheduled jobs.
//
// Convex auto-detects this file's default export and registers the cron jobs
// on `npx convex dev` / deploy. The daily sweep drives bill reminders, a
// budget-alert safety net, and the monthly summary (see convex/notifications.ts).

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 02:30 UTC = 07:30 Pakistan Standard Time (UTC+5) — before the workday starts
// but safely after midnight, so "due today" bills arrive with the morning chai.
crons.daily(
  "notifications-daily-checks",
  { hourUTC: 2, minuteUTC: 30 },
  internal.notifications.runDailyChecks,
  {},
);

export default crons;
