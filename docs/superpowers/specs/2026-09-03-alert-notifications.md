# Design — Alert Notifications (Email + SMS)

> **Date:** 2026-09-03
> **Status:** User-directed — implemented
> **Scope:** Push the existing Phase 13 proactive alerts (budget 80%/100%, unusual
> spending, recurring-bill reminders) out to email and SMS, in addition to the
> existing dashboard cards. Monthly summary is **not** included (see §5).
> **References:** AGENTS.md Tier 4 / §17 (post-hackathon addition — see the
> annotations added there), `convex/proactive.ts` (Phase 13), AUDIT.md §12.
> **Not a numbered phase** — the numbered spec ends at Phase 15 (see
> PROGRESS.md). This is a discrete post-hackathon addition, staged and
> documented the same way a phase would be.

---

## 1. Problem

`convex/proactive.ts` derives alerts live, on read, for the dashboard only —
nothing reaches a user who isn't looking at the app. The user asked for real
outbound delivery (email + SMS) for these alerts.

## 2. Provider decision

Evaluated in conversation before implementation (not re-litigated here in
detail):

- **Email → nodemailer over Gmail SMTP.** Vercel Marketplace's only messaging
  integration is Resend (email); AWS SES was the alternative pairing with the
  SMS account below. User explicitly chose Gmail SMTP for hackathon-scale
  simplicity — an App Password, no domain/DNS verification. Trade-off accepted:
  Gmail SMTP caps around ~500 sends/day, which is not a real constraint at this
  user count.
- **SMS → AWS End User Messaging (Pinpoint SMS Voice V2).** No SMS provider
  exists in the Vercel Marketplace at all. Twilio was ruled out — the user
  cannot create an account there. Confirmed against AWS's live country-support
  table that Pakistan (+92) sends via a **self-service alphanumeric Sender ID**
  with no destination-country pre-registration step, unlike India/Turkey/
  Vietnam/Saudi Arabia/etc. in the same table. Long codes in Pakistan are
  inbound-only — sending is Sender-ID-only, which is what's implemented.

## 3. AGENTS.md conflict

AGENTS.md Tier 4 / §17 lists "SMS or WhatsApp integration" and "Push
notifications" as explicitly deferred ("do not implement during the
hackathon"). Flagged to the user before building; the user's direction stood
as explicit and current. Both docs were annotated in place (not rewritten) to
record: (a) this is outbound alert *delivery*, not a new input channel or
browser push — "SMS-based input" and "Push notifications" remain deferred as
written; (b) the original deferral reasons (Twilio cost, FCM setup cost) don't
apply to this AWS/Gmail-based addition; (c) phases 0–15 were already
code-complete when this was built, so it was never going to land inside a
numbered phase anyway.

## 4. Architecture

`convex/proactive.ts`'s `getAlerts` query body was extracted into a shared
`computeAlerts(ctx, user)` so the same derivation serves two callers:

- `getAlerts` (existing, auth-scoped `query`) — dashboard, unchanged behavior.
- `getAlertsForUser` (new `internalQuery`, takes `userId` directly) — the cron
  sweep has no signed-in identity to resolve via `requireUser`.

New table `notificationsSent` (`userId`, `alertKey`, `periodKey`, `channels`)
mirrors `dismissedAlerts`'s key shape: one row per (alertKey, periodKey)
already pushed out, so an hourly sweep never re-sends the same alert, and a
new period (next month's budget cycle, the bill's next due date) naturally
re-arms it — exactly like re-appearing on the dashboard after dismissal.

`convex/crons.ts` (first cron in this codebase) runs `convex/notifications.ts
#runAlertSweep` hourly. That "use node" action:

1. `internal.users.listUsersForNotificationSweep` — every user with an email
   or phone on file.
2. Per user: `internal.proactive.getAlertsForUser` +
   `internal.proactive.getSentNotificationKeys`, diff out anything already sent.
3. `lib/notifications/templates.ts#buildNotificationCandidates` — pure,
   bilingual (`user.preferredLanguage`) email subject/body + SMS text.
4. `lib/notifications/email.ts` / `lib/notifications/sms.ts` — thin wrappers
   around nodemailer / the AWS SDK, reading credentials from `process.env`.
5. `internal.proactive.recordNotificationSent` — **only** for channels that
   actually succeeded. A channel with no credentials configured yet (e.g. AWS
   keys not set while Gmail is) fails silently per-send and retries next
   sweep instead of being dropped for the rest of the period; the other
   channel still goes out.

Reused as-is, no changes: `notificationPrefs` toggles gate which alert types
are even computed; `users.email` / `users.phone` (already populated from
Clerk) gate which channels fire per user. No new settings UI.

## 5. Explicitly out of scope here

- **Monthly summary** isn't included — it doesn't share the
  `(alertKey, periodKey)` shape the other three alert types use
  (`lastSummaryDismissedMonth` is a high-water mark, not a dismissal set), and
  it's a recap, not something time-sensitive enough to justify an SMS. Could
  be added later as a monthly (not hourly) cron if wanted.
- **No per-channel opt-out.** A user with `budget80: true` and a phone number
  gets both the dashboard card and an SMS; there's no "email only" toggle.
  `notificationPrefs` already gates by alert *type*; channel-level control
  would be a small additive change to that same object if it's ever wanted.
- **Hourly, not real-time.** Alerts don't fire the instant a transaction
  crosses a threshold — they fire on the next sweep, up to an hour later. This
  was a judgment call (not a hard requirement) given `notificationsSent`
  dedup makes a tighter interval mostly redundant sweeps.

## 6. Credential setup

Left for the user — see `docs/DEPLOY.md` §1a and `.env.example` for the full
walkthrough (Gmail App Password generation, AWS IAM policy, Sender ID
registration for Pakistan, region choice). Both `npx convex env set ...` (dev)
and the `--prod` variants are documented; the feature degrades gracefully
per-channel until both are set.

## 7. Testing

`tests/unit/notifications-templates.test.ts` — the only pure, easily-testable
surface (bilingual template rendering, alertKey/periodKey passthrough for
dedup, severity/overdue branching). Email/SMS sending itself isn't covered by
an automated test — there's no sandbox-safe way to assert a real send without
either mocking away the thing being tested or spending real quota; verify
manually once credentials are set (see docs/DEPLOY.md).

Full gate run clean: `npm run typecheck && npm run lint && npm test && npm run
build && npx convex codegen` — 206 passing, 3 self-skipping live (up from 200).
