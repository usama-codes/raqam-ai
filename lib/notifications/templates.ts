// lib/notifications/templates.ts — bilingual (ur/en) email/SMS bodies for the
// alert-notification sweep (convex/notifications.ts). Pure functions, no I/O,
// so they're unit-testable without a Convex backend or a real inbox/phone.

import { formatPKR } from "@/lib/i18n/format";
import type { ProactiveAlerts } from "@/convex/proactive";

export type Lang = "ur" | "en";

type BudgetAlert = ProactiveAlerts["budgetAlerts"][number];
type UnusualAlert = ProactiveAlerts["unusualAlerts"][number];
type BillReminder = ProactiveAlerts["billReminders"][number];

export interface NotificationCandidate {
  alertKey: string;
  periodKey: string;
  email: { subject: string; text: string };
  sms: { text: string };
}

function budgetMessage(a: BudgetAlert, lang: Lang): NotificationCandidate {
  const name = lang === "ur" ? a.categoryNameUr : a.categoryName;
  const spent = formatPKR(a.spent);
  const limit = formatPKR(a.limit);
  const isOver = a.severity === "over";

  const text =
    lang === "ur"
      ? isOver
        ? `⚠️ آپ "${name}" کے بجٹ سے تجاوز کر گئے ہیں: ${spent} / ${limit} (${a.pct}%)۔`
        : `⚠️ آپ کا "${name}" بجٹ ${a.pct}% تک پہنچ گیا ہے: ${spent} / ${limit}۔`
      : isOver
        ? `⚠️ You've gone over budget on "${name}": ${spent} of ${limit} (${a.pct}%).`
        : `⚠️ Your "${name}" budget has reached ${a.pct}%: ${spent} of ${limit}.`;

  const subject =
    lang === "ur"
      ? isOver
        ? `بجٹ سے تجاوز: ${name}`
        : `بجٹ الرٹ: ${name}`
      : isOver
        ? `Over budget: ${name}`
        : `Budget alert: ${name}`;

  return { alertKey: a.alertKey, periodKey: a.periodKey, email: { subject, text }, sms: { text } };
}

function unusualSpendMessage(a: UnusualAlert, lang: Lang): NotificationCandidate {
  const name = lang === "ur" ? a.categoryNameUr : a.categoryName;
  const current = formatPKR(a.currentSpend);
  const avg = formatPKR(Math.round(a.average));

  const text =
    lang === "ur"
      ? `📈 "${name}" میں اس مہینے معمول سے ${a.deviationPercent}% زیادہ خرچ ہوا: ${current} (اوسط ${avg})۔`
      : `📈 Unusual spending in "${name}": ${a.deviationPercent}% above your 3-month average of ${avg} (now ${current}).`;

  const subject =
    lang === "ur" ? `غیر معمولی خرچ: ${name}` : `Unusual spending: ${name}`;

  return { alertKey: a.alertKey, periodKey: a.periodKey, email: { subject, text }, sms: { text } };
}

function billReminderMessage(b: BillReminder, lang: Lang): NotificationCandidate {
  const amount = formatPKR(b.amount);
  const dueText =
    lang === "ur"
      ? b.overdue
        ? "کی میعاد گزر چکی ہے"
        : b.daysUntilDue <= 0
          ? "آج واجب الادا ہے"
          : `${b.daysUntilDue} دن میں واجب الادا ہے`
      : b.overdue
        ? "is overdue"
        : b.daysUntilDue <= 0
          ? "is due today"
          : `is due in ${b.daysUntilDue} day${b.daysUntilDue === 1 ? "" : "s"}`;

  const text =
    lang === "ur"
      ? `🔔 یاد دہانی: "${b.description}" کی ${amount} کی ادائیگی ${dueText}۔`
      : `🔔 Reminder: "${b.description}" (${amount}) ${dueText}.`;

  const subject =
    lang === "ur" ? `یاد دہانی: ${b.description}` : `Reminder: ${b.description}`;

  return { alertKey: b.alertKey, periodKey: b.periodKey, email: { subject, text }, sms: { text } };
}

/**
 * Flattens every currently-active alert (already filtered by dismissal +
 * notificationPrefs in `computeAlerts`) into a bilingual notification
 * candidate. The sweep is responsible for further filtering out anything
 * already recorded in `notificationsSent`.
 */
export function buildNotificationCandidates(
  alerts: ProactiveAlerts,
  lang: Lang,
): NotificationCandidate[] {
  return [
    ...alerts.budgetAlerts.map((a) => budgetMessage(a, lang)),
    ...alerts.unusualAlerts.map((a) => unusualSpendMessage(a, lang)),
    ...alerts.billReminders.map((b) => billReminderMessage(b, lang)),
  ];
}
