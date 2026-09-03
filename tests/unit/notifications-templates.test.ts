import { describe, it, expect } from "vitest";
import { buildNotificationCandidates } from "@/lib/notifications/templates";
import type { ProactiveAlerts } from "@/convex/proactive";

const emptyAlerts: ProactiveAlerts = {
  budgetAlerts: [],
  unusualAlerts: [],
  billReminders: [],
};

describe("buildNotificationCandidates", () => {
  it("returns nothing when there are no active alerts", () => {
    expect(buildNotificationCandidates(emptyAlerts, "en")).toEqual([]);
  });

  it("carries alertKey/periodKey through unchanged for dedup", () => {
    const alerts: ProactiveAlerts = {
      ...emptyAlerts,
      budgetAlerts: [
        {
          alertKey: "budget100:c1",
          periodKey: "1234",
          categoryId: "c1",
          categoryNameUr: "کھانا",
          categoryName: "Food",
          categoryIcon: "🍔",
          spent: 12000,
          limit: 10000,
          pct: 120,
          severity: "over",
        },
      ],
    };
    const [candidate] = buildNotificationCandidates(alerts, "en");
    expect(candidate.alertKey).toBe("budget100:c1");
    expect(candidate.periodKey).toBe("1234");
  });

  it("renders budget-over alerts in the requested language", () => {
    const alerts: ProactiveAlerts = {
      ...emptyAlerts,
      budgetAlerts: [
        {
          alertKey: "budget100:c1",
          periodKey: "1234",
          categoryId: "c1",
          categoryNameUr: "کھانا",
          categoryName: "Food",
          categoryIcon: "🍔",
          spent: 12000,
          limit: 10000,
          pct: 120,
          severity: "over",
        },
      ],
    };

    const [en] = buildNotificationCandidates(alerts, "en");
    expect(en.sms.text).toContain("Food");
    expect(en.sms.text).toContain("120%");
    expect(en.email.subject).toBe("Over budget: Food");

    const [ur] = buildNotificationCandidates(alerts, "ur");
    expect(ur.sms.text).toContain("کھانا");
    expect(ur.email.subject).toContain("کھانا");
  });

  it("renders warning-severity budget alerts distinctly from over-budget", () => {
    const alerts: ProactiveAlerts = {
      ...emptyAlerts,
      budgetAlerts: [
        {
          alertKey: "budget80:c1",
          periodKey: "1234",
          categoryId: "c1",
          categoryNameUr: "کھانا",
          categoryName: "Food",
          categoryIcon: "🍔",
          spent: 8000,
          limit: 10000,
          pct: 80,
          severity: "warning",
        },
      ],
    };
    const [en] = buildNotificationCandidates(alerts, "en");
    expect(en.email.subject).toBe("Budget alert: Food");
    expect(en.sms.text).not.toContain("gone over budget");
  });

  it("renders unusual-spend alerts with the deviation percentage", () => {
    const alerts: ProactiveAlerts = {
      ...emptyAlerts,
      unusualAlerts: [
        {
          alertKey: "anomaly:c2",
          periodKey: "1234",
          categoryId: "c2",
          categoryNameUr: "تفریح",
          categoryName: "Entertainment",
          categoryIcon: "🎬",
          average: 2000,
          currentSpend: 3000,
          deviationPercent: 50,
        },
      ],
    };
    const [en] = buildNotificationCandidates(alerts, "en");
    expect(en.sms.text).toContain("Entertainment");
    expect(en.sms.text).toContain("50%");
  });

  it("distinguishes overdue, due-today, and future bill reminders", () => {
    const bill = (over: Partial<ProactiveAlerts["billReminders"][number]>) => ({
      alertKey: "bill:r1",
      periodKey: "5678",
      recurringId: "r1",
      description: "Electricity",
      amount: 4500,
      categoryId: "c3",
      categoryNameUr: "بجلی",
      categoryIcon: "💡",
      nextDueDate: 5678,
      daysUntilDue: 2,
      overdue: false,
      ...over,
    });

    const overdue = buildNotificationCandidates(
      { ...emptyAlerts, billReminders: [bill({ overdue: true, daysUntilDue: -1 })] },
      "en",
    )[0];
    expect(overdue.sms.text).toContain("overdue");

    const dueToday = buildNotificationCandidates(
      { ...emptyAlerts, billReminders: [bill({ daysUntilDue: 0 })] },
      "en",
    )[0];
    expect(dueToday.sms.text).toContain("due today");

    const dueSoon = buildNotificationCandidates(
      { ...emptyAlerts, billReminders: [bill({ daysUntilDue: 2 })] },
      "en",
    )[0];
    expect(dueSoon.sms.text).toContain("due in 2 days");
  });
});
