"use client";

import * as React from "react";
import Link from "next/link";
import {
  TriangleAlert,
  CalendarClock,
  TrendingUp,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/shared/Toast";
import {
  useProactiveAlerts,
  type BillReminder,
} from "@/hooks/useProactiveAlerts";
import { useMonthlySummary } from "@/hooks/useMonthlySummary";
import { useRecurring } from "@/hooks/useRecurring";

// ─── palette (from app/globals.css design tokens) ──────────────────────────────

const SPINE = {
  caution: "var(--color-rq-caution)",
  danger: "var(--color-rq-danger)",
  info: "var(--color-rq-success)",
  gold: "var(--color-rq-gold)",
} as const;

const CHIP_BG = {
  caution: "var(--color-rq-alert-bg)",
  danger: "var(--color-rq-error-bg)",
  info: "var(--color-rq-info-bg)",
  gold: "var(--color-rq-chip-bg)",
} as const;

type Tone = keyof typeof SPINE;

function pkr(n: number) {
  return `Rs. ${Math.round(n).toLocaleString()}`;
}

// ─── generic card shell ───────────────────────────────────────────────────────

function AlertShell({
  tone,
  icon,
  index,
  onDismiss,
  dismissLabel,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  index: number;
  onDismiss?: () => void;
  dismissLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--color-rq-card-border)] bg-[var(--color-rq-card)] animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <span
        className="absolute inset-y-0 start-0 w-[3px]"
        style={{ background: SPINE[tone] }}
        aria-hidden
      />
      <div className="flex items-start gap-3 p-3.5 ps-[18px]">
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
          style={{ background: CHIP_BG[tone], color: SPINE[tone] }}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">{children}</div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label={dismissLabel}
            title={dismissLabel}
            className="-me-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-rq-text-faint)] transition-colors hover:bg-[var(--color-rq-chip-bg)] hover:text-[var(--color-rq-text-muted)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function ProactiveAlerts() {
  const { t, language } = useLanguage();
  const { addToast } = useToast();
  const { budgetAlerts, unusualAlerts, billReminders, dismiss, loading } =
    useProactiveAlerts();
  const { show: showSummary, summary, dismiss: dismissSummary } =
    useMonthlySummary();
  const { markPaid } = useRecurring();

  // Hide instantly on dismiss; the reactive query catches up a beat later.
  const [hiddenKeys, setHiddenKeys] = React.useState<Set<string>>(new Set());
  const [summaryHidden, setSummaryHidden] = React.useState(false);

  const hide = React.useCallback(
    (alertKey: string, periodKey: string) => {
      setHiddenKeys((prev) => new Set(prev).add(alertKey));
      dismiss(alertKey, periodKey).catch(() => {
        setHiddenKeys((prev) => {
          const next = new Set(prev);
          next.delete(alertKey);
          return next;
        });
      });
    },
    [dismiss],
  );

  const visibleBudget = budgetAlerts.filter((a) => !hiddenKeys.has(a.alertKey));
  const visibleUnusual = unusualAlerts.filter((a) => !hiddenKeys.has(a.alertKey));
  const visibleBills = billReminders.filter((a) => !hiddenKeys.has(a.alertKey));
  const showSummaryCard = showSummary && summary && !summaryHidden;

  const nothingToShow =
    !showSummaryCard &&
    visibleBudget.length === 0 &&
    visibleUnusual.length === 0 &&
    visibleBills.length === 0;

  if (loading || nothingToShow) return null;

  let i = 0;

  return (
    <section
      aria-label={t("proactive.regionLabel")}
      className="flex flex-col gap-2.5"
    >
      <span className="font-[var(--font-manrope)] text-[10px] font-semibold tracking-[.18em] text-[var(--color-rq-text-faint)]">
        {t("proactive.regionLabel").toUpperCase()}
      </span>

      {showSummaryCard && (
        <MonthlySummaryCard
          index={i++}
          summary={summary}
          onDismiss={() => {
            setSummaryHidden(true);
            dismissSummary().catch(() => setSummaryHidden(false));
          }}
        />
      )}

      {visibleBills.length > 0 && (
        <BillReminderCard
          index={i++}
          bills={visibleBills}
          onDismiss={hide}
          onMarkPaid={async (bill, logExpense) => {
            hide(bill.alertKey, bill.periodKey);
            try {
              await markPaid(bill.recurringId, logExpense);
              addToast({ type: "success", title: t("recurring.toast.paid") });
            } catch {
              addToast({ type: "error", title: t("recurring.toast.error") });
            }
          }}
        />
      )}

      {visibleUnusual.map((a) => (
        <AlertShell
          key={a.alertKey}
          tone="info"
          index={i++}
          icon={<TrendingUp className="h-4 w-4" />}
          dismissLabel={t("proactive.dismiss")}
          onDismiss={() => hide(a.alertKey, a.periodKey)}
        >
          <span className="text-[14px] font-semibold leading-snug">
            {t("proactive.unusualTitle")} ·{" "}
            {language === "ur" ? a.categoryNameUr : a.categoryName}
          </span>
          <span className="text-[13px] leading-relaxed text-[var(--color-rq-text-secondary)]">
            {t("proactive.unusualDetail").replace(
              "{pct}",
              String(a.deviationPercent),
            )}{" "}
            · <span className="font-[var(--font-manrope)]">{pkr(a.currentSpend)}</span>{" "}
            <span className="text-[var(--color-rq-text-faint)]">
              ({t("proactive.unusualAvg")}{" "}
              <span className="font-[var(--font-manrope)]">{pkr(a.average)}</span>)
            </span>
          </span>
          <Link
            href="/transactions"
            className="mt-0.5 w-fit text-[13px] text-[var(--color-rq-cta)] hover:underline"
          >
            {t("proactive.viewTxns")}
          </Link>
        </AlertShell>
      ))}

      {visibleBudget.map((a) => {
        const over = a.severity === "over";
        return (
          <AlertShell
            key={a.alertKey}
            tone={over ? "danger" : "caution"}
            index={i++}
            icon={<TriangleAlert className="h-4 w-4" />}
            dismissLabel={t("proactive.dismiss")}
            onDismiss={() => hide(a.alertKey, a.periodKey)}
          >
            <span className="text-[14px] font-semibold leading-snug">
              {over
                ? t("proactive.budgetOverTitle")
                : t("proactive.budgetWarnTitle")}{" "}
              · {language === "ur" ? a.categoryNameUr : a.categoryName}
            </span>
            <span className="text-[13px] leading-relaxed text-[var(--color-rq-text-secondary)]">
              <span className="font-[var(--font-manrope)]" style={{ color: SPINE[over ? "danger" : "caution"] }}>
                {a.pct}%
              </span>{" "}
              · {t("proactive.budgetSpentOf")}{" "}
              <span className="font-[var(--font-manrope)]">
                {pkr(a.spent)} / {pkr(a.limit)}
              </span>
            </span>
            <Link
              href="/budgets"
              className="mt-0.5 w-fit text-[13px] text-[var(--color-rq-cta)] hover:underline"
            >
              {t("proactive.viewBudget")}
            </Link>
          </AlertShell>
        );
      })}
    </section>
  );
}

// ─── bill reminders (one card, multiple rows) ─────────────────────────────────

function BillReminderCard({
  bills,
  index,
  onDismiss,
  onMarkPaid,
}: {
  bills: BillReminder[];
  index: number;
  onDismiss: (alertKey: string, periodKey: string) => void;
  onMarkPaid: (bill: BillReminder, logExpense: boolean) => void;
}) {
  const { t } = useLanguage();
  const [logExpense, setLogExpense] = React.useState<Record<string, boolean>>(
    {},
  );
  const isLogging = (id: string) => logExpense[id] ?? true;

  const anyOverdue = bills.some((b) => b.overdue);

  // `daysUntilDue` is computed server-side (convex/proactive.ts) so the client
  // never needs Date.now() during render.
  const dueLabel = (bill: BillReminder): string => {
    if (bill.overdue) {
      return t("proactive.billOverdue").replace(
        "{days}",
        String(Math.max(1, -bill.daysUntilDue)),
      );
    }
    if (bill.daysUntilDue <= 0) return t("proactive.billDueToday");
    if (bill.daysUntilDue === 1) return t("proactive.billDueTomorrow");
    return t("proactive.billDueInDays").replace(
      "{days}",
      String(bill.daysUntilDue),
    );
  };

  return (
    <AlertShell
      tone={anyOverdue ? "danger" : "caution"}
      index={index}
      icon={<CalendarClock className="h-4 w-4" />}
      dismissLabel={t("proactive.dismiss")}
    >
      <span className="text-[14px] font-semibold leading-snug">
        {t("proactive.billDueTitle")}
      </span>
      <div className="mt-1 flex flex-col divide-y divide-[var(--color-rq-divider)]">
        {bills.map((bill) => (
          <div key={bill.alertKey} className="flex flex-col gap-2 py-2.5 first:pt-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px]">
                <span className="me-1">{bill.categoryIcon}</span>
                {bill.description}
              </span>
              <span className="shrink-0 font-[var(--font-manrope)] text-[13px] font-semibold">
                {pkr(bill.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[12px]"
                style={{
                  color: bill.overdue
                    ? SPINE.danger
                    : "var(--color-rq-text-secondary)",
                }}
              >
                {dueLabel(bill)}
              </span>
              <button
                onClick={() => onDismiss(bill.alertKey, bill.periodKey)}
                className="text-[12px] text-[var(--color-rq-text-faint)] hover:text-[var(--color-rq-text-muted)]"
              >
                {t("proactive.dismiss")}
              </button>
            </div>
            <label className="flex items-center gap-2 text-[12px] text-[var(--color-rq-text-secondary)]">
              <input
                type="checkbox"
                checked={isLogging(bill.recurringId)}
                onChange={(e) =>
                  setLogExpense((prev) => ({
                    ...prev,
                    [bill.recurringId]: e.target.checked,
                  }))
                }
                className="h-3.5 w-3.5 accent-[var(--color-rq-cta)]"
              />
              {t("proactive.billLogExpense")}
            </label>
            <button
              onClick={() => onMarkPaid(bill, isLogging(bill.recurringId))}
              className="w-fit rounded-[9px] bg-[var(--color-rq-cta)] px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[var(--color-rq-cta-hover)]"
            >
              {t("proactive.billMarkPaid")}
            </button>
          </div>
        ))}
      </div>
    </AlertShell>
  );
}

// ─── monthly summary ─────────────────────────────────────────────────────────

function MonthlySummaryCard({
  summary,
  index,
  onDismiss,
}: {
  summary: NonNullable<ReturnType<typeof useMonthlySummary>["summary"]>;
  index: number;
  onDismiss: () => void;
}) {
  const { t, language } = useLanguage();
  const monthLabel = new Date(summary.month).toLocaleDateString(
    language === "ur" ? "ur-PK" : "en-PK",
    { month: "long", year: "numeric" },
  );

  const figures: Array<{ label: string; value: string; accent?: string }> = [
    { label: t("summary.income"), value: pkr(summary.income) },
    { label: t("summary.expenses"), value: pkr(summary.expenses) },
    {
      label: t("summary.net"),
      value: pkr(summary.net),
      accent:
        summary.net >= 0 ? "var(--color-rq-cta)" : "var(--color-rq-danger)",
    },
    { label: t("summary.savingsRate"), value: `${summary.savingsRate}%` },
  ];

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--color-rq-card-border)] border-t-2 border-t-[var(--color-rq-gold)] bg-[var(--color-rq-card)] animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex flex-col gap-3.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-rq-gold)]" />
            <span className="text-[14px] font-semibold">
              {t("summary.title")}
            </span>
            <span className="text-[12px] text-[var(--color-rq-text-faint)]">
              {monthLabel}
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 rounded-md px-2 py-1 text-[12px] text-[var(--color-rq-text-faint)] transition-colors hover:bg-[var(--color-rq-chip-bg)] hover:text-[var(--color-rq-text-muted)]"
          >
            {t("summary.dismiss")}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          {figures.map((f) => (
            <div key={f.label} className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[var(--color-rq-text-faint)]">
                {f.label}
              </span>
              <span
                className="font-[var(--font-manrope)] text-[16px] font-bold tracking-[-.01em]"
                style={f.accent ? { color: f.accent } : undefined}
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>

        {summary.topCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-rq-divider)] pt-3">
            <span className="text-[11px] text-[var(--color-rq-text-faint)]">
              {t("summary.topCategories")}
            </span>
            {summary.topCategories.map((c) => (
              <span
                key={c.categoryId}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-rq-chip-bg)] px-2.5 py-1 text-[12px]"
              >
                <span>{c.icon}</span>
                {language === "ur" ? c.nameUr : c.name}
                <span className="font-[var(--font-manrope)] text-[var(--color-rq-text-secondary)]">
                  {pkr(c.amount)}
                </span>
              </span>
            ))}
          </div>
        )}

        {summary.expenseDeltaPct !== null && summary.expenseDeltaPct !== 0 && (
          <span
            className="text-[12px]"
            style={{
              color:
                summary.expenseDeltaPct > 0
                  ? "var(--color-rq-warning)"
                  : "var(--color-rq-success)",
            }}
          >
            {summary.expenseDeltaPct > 0
              ? t("summary.expenseUp").replace(
                  "{pct}",
                  String(summary.expenseDeltaPct),
                )
              : t("summary.expenseDown").replace(
                  "{pct}",
                  String(Math.abs(summary.expenseDeltaPct)),
                )}
          </span>
        )}
      </div>
    </div>
  );
}
