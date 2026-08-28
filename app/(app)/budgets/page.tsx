"use client";

import { useBudgets } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import {
  ListSkeleton,
  EmptyState,
  ErrorState,
  ChartSkeleton,
} from "@/components/shared/DataStates";

const tblGrid = "grid-cols-[minmax(140px,1.3fr)_130px_minmax(120px,1fr)_100px]";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return "#B3261E";
  if (pct >= 80) return "#C4622D";
  if (pct >= 60) return "#D8A72A";
  return "#22B07D";
}

export default function BudgetsPage() {
  const { budget, budgetCategories, loading, error } = useBudgets();
  const { categories } = useCategories();

  const getCategoryName = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId || c.name === catId);
    return cat?.nameUr ?? catId;
  };

  const totalLimit = budget?.totalLimit ?? 0;
  const totalSpent = budgetCategories.reduce((sum, b) => sum + b.spent, 0);
  const overallPct =
    totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">ماہانہ بجٹ</h1>
          <p className="text-[14px] text-[#6B7A70]">
            {budgetCategories.length > 0
              ? `کل حد ${pkr(totalLimit)} · خرچ ${pkr(totalSpent)}`
              : "کوئی بجٹ مقرر نہیں"}
          </p>
        </div>
        <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
          زمرہ شامل کریں
        </button>
      </header>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
          <ChartSkeleton />
          <ListSkeleton rows={5} />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="px-6 pb-12 pt-6 sm:px-10">
          <ErrorState />
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && budgetCategories.length === 0 && (
        <div className="px-6 pb-12 pt-6 sm:px-10">
          <EmptyState
            icon="📊"
            title="کوئی بجٹ مقرر نہیں"
            description="ماہانہ بجٹ بنائیں اور اپنے اخراجات پر نظر رکھیں۔ زمرہ شامل کریں بٹن دبائیں۔"
            actionLabel="زمرہ شامل کریں"
          />
        </div>
      )}

      {/* ── Populated ── */}
      {!loading && !error && budgetCategories.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-6 sm:px-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* ── Left column ── */}
          <div className="flex flex-col gap-[18px]">
            {/* Overall utilization */}
            <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-6">
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[14px] text-[#6B7A70]">
                    مجموعی استعمال
                  </span>
                  <span className="font-[var(--font-manrope)] text-[32px] font-extrabold">
                    {overallPct}%
                  </span>
                </div>
                <span className="text-[14px] text-[#6B7A70]">
                  {pkr(Math.max(totalLimit - totalSpent, 0))} باقی
                </span>
              </div>
              <div className="h-[14px] overflow-hidden rounded-full bg-[#EDEAE0]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(overallPct, 100)}%`,
                    background:
                      overallPct >= 80
                        ? "linear-gradient(90deg,#C4622D,#B3261E)"
                        : "linear-gradient(90deg,#0F5132,#22B07D)",
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-[18px] text-[13px] text-[#6B7A70]">
                {[
                  { c: "#22B07D", l: "0–59٪ محفوظ" },
                  { c: "#D8A72A", l: "60–79٪ خیال رکھیں" },
                  { c: "#C4622D", l: "80–99٪ انتباہ" },
                  { c: "#B3261E", l: "100٪+ حد سے باہر" },
                ].map((leg) => (
                  <span key={leg.l} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-[3px]"
                      style={{ background: leg.c }}
                    />
                    {leg.l}
                  </span>
                ))}
              </div>
            </div>

            {/* Category table */}
            <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
              <div
                className={`hidden min-w-[640px] ${tblGrid} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
              >
                <span>زمرہ</span>
                <span>ماہانہ حد</span>
                <span>استعمال</span>
                <span>باقی</span>
              </div>
              {budgetCategories.map((row, i) => {
                const pct =
                  row.limit > 0 ? Math.round((row.spent / row.limit) * 100) : 0;
                const barColor = getBarColor(pct);
                const remaining = Math.max(row.limit - row.spent, 0);
                return (
                  <div key={row.id}>
                    {/* Desktop row */}
                    <div
                      className={`hidden min-w-[640px] ${tblGrid} grid items-center gap-3.5 px-5 py-4 md:grid ${i < budgetCategories.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                    >
                      <span className="text-[15px]">
                        {getCategoryName(row.categoryId)}
                      </span>
                      <input
                        defaultValue={pkr(row.limit)}
                        className="w-full rounded-[9px] border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-[9px] font-[var(--font-manrope)] text-[14px]"
                        readOnly
                      />
                      <div className="flex flex-col gap-1.5">
                        <span
                          className="font-[var(--font-manrope)] text-[12px]"
                          style={{ color: barColor }}
                        >
                          {pct}% · {pkr(row.spent)}
                        </span>
                        <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                      </div>
                      <span
                        className="font-[var(--font-manrope)] text-[14px]"
                        style={
                          remaining === 0 ? { color: "#B3261E" } : undefined
                        }
                      >
                        {pkr(remaining)}
                      </span>
                    </div>
                    {/* Mobile card */}
                    <div
                      className={`px-4 py-3 md:hidden ${i < budgetCategories.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                    >
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="font-medium">
                          {getCategoryName(row.categoryId)}
                        </span>
                        <span
                          className="font-[var(--font-manrope)] text-[12px]"
                          style={{ color: barColor }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[12px] text-[#6B7A70]">
                        <span>حد: {pkr(row.limit)}</span>
                        <span>باقی: {pkr(remaining)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">
            {/* AI Recommendation placeholder */}
            <div className="flex flex-col gap-3.5 rounded-2xl bg-[#0F5132] p-[22px] text-[#EAF1EB]">
              <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#E8B931]">
                AI RECOMMENDATION
              </span>
              <h2 className="text-[19px] font-bold leading-[1.85]">
                بجٹ کی تجاویز کے لیے معاون سے پوچھیں
              </h2>
              <p className="text-[15px] leading-[2.05] text-[#CBDDD1]">
                جیسے ہی آپ کے لین دین کا ڈیٹا دستیاب ہو گا، معاون آپ کے اخراجات
                کا تجزیہ کر کے بجٹ کی تجاویز دے گا۔
              </p>
              <div className="flex gap-2.5">
                <button className="rounded-[10px] border-0 bg-[#E8B931] px-[18px] py-3 text-[14px] font-bold text-[#0B3B26] hover:bg-[#F2C846]">
                  معاون سے پوچھیں
                </button>
              </div>
            </div>

            {/* Budget vs actual placeholder */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h3 className="text-[18px] font-bold">بجٹ بمقابلہ حقیقت</h3>
              <p className="text-[14px] leading-[2] text-[#6B7A70]">
                پچھلے مہینے کا ڈیٹا دستیاب نہیں۔ جیسے ہی دو مہینوں کا ڈیٹا ہو
                گا، موازنہ نظر آئے گا۔
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
