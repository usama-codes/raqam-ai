"use client";

import Link from "next/link";
import { useFinancialSummary } from "@/hooks/useFinancialSummary";
import { useGoals } from "@/hooks/useGoals";
import { useBudgets } from "@/hooks/useBudgets";
import {
  PageSkeleton,
  EmptyState,
  ErrorState,
  StatCardSkeleton,
  ChartSkeleton,
  ListSkeleton,
} from "@/components/shared/DataStates";

function pkr(n: string | number) {
  return `Rs. ${typeof n === "number" ? n.toLocaleString() : n}`;
}

export default function DashboardPage() {
  const {
    summary,
    loading: summaryLoading,
    error: summaryError,
  } = useFinancialSummary();
  const { goals, loading: goalsLoading, error: goalsError } = useGoals();
  const {
    budgetCategories,
    loading: budgetLoading,
    error: budgetError,
  } = useBudgets();

  const loading = summaryLoading || goalsLoading || budgetLoading;
  const hasError = summaryError || goalsError || budgetError;
  const isEmpty =
    !summary && goals.length === 0 && budgetCategories.length === 0;

  // ── Loading state ──
  if (loading) return <PageSkeleton />;

  // ── Error state ──
  if (hasError) {
    return (
      <div className="flex flex-col">
        <DashboardHeader />
        <div className="px-6 pb-12 pt-7 sm:px-10">
          <ErrorState />
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (isEmpty) {
    return (
      <div className="flex flex-col">
        <DashboardHeader />
        <div className="flex flex-col gap-[22px] px-6 pb-12 pt-7 sm:px-10">
          {/* Empty stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <EmptyState
            icon="📊"
            title="ابھی کوئی ڈیٹا نہیں"
            description="اپنا پہلا لین دین شامل کریں یا بینک اسٹیٹمنٹ درآمد کریں تاکہ آپ کا ڈیش بورڈ نظر آئے۔"
            actionLabel="+ نیا لین دین"
          />
        </div>
      </div>
    );
  }

  // ── Populated state ──
  const categorySpending = summary?.categoryBreakdown ?? [];
  const recentTransactions = summary?.recentTransactions ?? [];
  const upcomingBills = summary?.upcomingBills ?? [];

  return (
    <div className="flex flex-col">
      <DashboardHeader />

      <div className="flex flex-col gap-[22px] px-6 pb-12 pt-7 sm:px-10">
        {/* Budget alert banner (placeholder — dynamic in Phase 6) */}

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-[#0F5132] p-5 text-[#EAF1EB]">
            <span className="text-[13px] text-[#B9CFC1]">اس مہینے کی بچت</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr(summary?.netSavings ?? 0)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">کل آمدنی</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr(summary?.totalIncome ?? 0)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">کل اخراجات</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr(summary?.totalExpenses ?? 0)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">بچت کی شرح</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {summary ? `${summary.savingsRate.toFixed(1)}%` : "—"}
            </span>
            <div className="h-[6px] overflow-hidden rounded-full bg-[#EDEAE0]">
              <div
                className="h-full rounded-full bg-[#22B07D]"
                style={{
                  width: `${Math.min(summary?.savingsRate ?? 0, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Category spending + Trend */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Category spending */}
          {categorySpending.length > 0 ? (
            <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold">زمرے کے حساب سے خرچ</h2>
                <span className="font-[var(--font-manrope)] text-[12px] text-[#6B7A70]">
                  {pkr(summary?.totalExpenses ?? 0)}
                </span>
              </div>
              <div className="flex flex-col gap-3.5">
                {categorySpending.map((cat) => (
                  <div key={cat.categoryId} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[14px]">
                      <span>{cat.nameUr}</span>
                      <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                        {pkr(cat.amount)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#EDEAE0]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          background: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <ChartSkeleton />
          )}

          {/* Trend + Bills */}
          <div className="flex flex-col gap-4">
            {/* 6-month trend placeholder */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h2 className="text-[18px] font-bold">چھ مہینوں کا رجحان</h2>
              <p className="text-[13px] leading-[1.9] text-[#6B7A70]">
                رجحان کا ڈیٹا دستیاب نہیں — جیسے ہی لین دین شامل ہوں گے، چارٹ
                نظر آئے گا۔
              </p>
            </div>

            {/* Upcoming bills */}
            {upcomingBills.length > 0 ? (
              <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                <h2 className="text-[18px] font-bold">
                  اگلے 7 دن میں متوقع بل
                </h2>
                {upcomingBills.map((bill, i) => (
                  <div
                    key={bill.label}
                    className={`flex justify-between text-[14px] ${i < upcomingBills.length - 1 ? "border-b border-[#F1EEE4] pb-2.5" : ""}`}
                  >
                    <span>{bill.label}</span>
                    <span className="font-[var(--font-manrope)] font-semibold">
                      {pkr(bill.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Recent transactions + Budget util + Goals */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent transactions */}
          {recentTransactions.length > 0 ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold">حالیہ لین دین</h2>
                <Link
                  href="/transactions"
                  className="text-[14px] text-[#0F5132] hover:underline"
                >
                  سب دیکھیں →
                </Link>
              </div>
              <div className="flex flex-col gap-0.5">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-3.5 border-b border-[#F4F1E8] py-[11px] last:border-0"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#E6EFE9] text-[15px]">
                      {tx.icon}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px]">{tx.label}</span>
                      <span className="text-[12px] text-[#8A9690]">
                        {tx.meta}
                      </span>
                    </div>
                    <span
                      className={`font-[var(--font-manrope)] text-[15px] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                    >
                      {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h2 className="text-[18px] font-bold">حالیہ لین دین</h2>
              <EmptyState
                icon="💸"
                title="کوئی لین دین نہیں"
                description="ابھی تک کوئی لین دین درج نہیں ہوا۔"
              />
            </div>
          )}

          {/* Budget utilization + Savings goals */}
          <div className="flex flex-col gap-4">
            {/* Budget utilization */}
            {budgetCategories.length > 0 ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                <div className="flex items-center justify-between">
                  <h2 className="text-[18px] font-bold">بجٹ کا استعمال</h2>
                  <Link
                    href="/budgets"
                    className="text-[14px] text-[#0F5132] hover:underline"
                  >
                    تفصیل →
                  </Link>
                </div>
                <div className="flex flex-col gap-[13px]">
                  {budgetCategories.map((b) => {
                    const pct =
                      b.limit > 0 ? Math.round((b.spent / b.limit) * 100) : 0;
                    const color =
                      pct >= 100
                        ? "#B3261E"
                        : pct >= 80
                          ? "#C4622D"
                          : pct >= 60
                            ? "#D8A72A"
                            : "#22B07D";
                    return (
                      <div key={b.id} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-[14px]">
                          <span>{b.categoryId}</span>
                          <span
                            className="font-[var(--font-manrope)]"
                            style={{ color }}
                          >
                            {pct}% · {pkr(b.spent)} / {pkr(b.limit)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Savings goals */}
            {goals.length > 0 ? (
              <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
                <h2 className="text-[18px] font-bold">بچت کے اہداف</h2>
                {goals.map((g) => {
                  const pct =
                    g.targetAmount > 0
                      ? Math.round((g.currentAmount / g.targetAmount) * 100)
                      : 0;
                  return (
                    <div key={g.id} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[14px]">
                        <span>{g.nameUr ?? g.name}</span>
                        <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                          {pkr(g.currentAmount)} / {pkr(g.targetAmount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                        <div
                          className="h-full rounded-full bg-[#0F5132]"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared header ── */
function DashboardHeader() {
  return (
    <header className="sticky top-0 z-[5] flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] font-bold leading-[1.7]">خوش آمدید</h1>
        <p className="text-[14px] text-[#6B7A70]">آپ کے مالی خلاصے</p>
      </div>
      <div className="flex items-center gap-2.5">
        <Link
          href="/transactions"
          className="hidden rounded-[10px] border border-[#E7E2D6] bg-[#F1EEE4] px-3.5 py-[9px] text-[14px] sm:block"
        >
          لین دین دیکھیں
        </Link>
        <Link
          href="/transactions"
          className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
        >
          + نیا لین دین
        </Link>
      </div>
    </header>
  );
}
