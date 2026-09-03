// convex/crons.ts — scheduled jobs. First cron in this codebase: the rest of
// the app derives everything live on read (see convex/proactive.ts header).

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Alert notifications (post-hackathon addition — see
// docs/superpowers/specs/2026-09-03-alert-notifications.md). Hourly is a
// deliberate compromise: budget/bill/anomaly alerts aren't time-critical
// enough to justify a tighter loop, and notificationsSent dedup means a
// shorter interval would only add near-empty sweeps.
crons.interval(
  "dispatch alert notifications",
  { hours: 1 },
  internal.notifications.runAlertSweep,
  {},
);

export default crons;
