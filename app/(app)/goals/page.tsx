"use client";

import * as React from "react";
import { useGoals } from "@/hooks/useGoals";
import {
  CardSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

export default function GoalsPage() {
  const { goals, loading, error, contributeToGoal } = useGoals();

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  /* ── Contribute dialog state ── */
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [activeGoal, setActiveGoal] = React.useState<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
  } | null>(null);
  const [amount, setAmount] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [fieldError, setFieldError] = React.useState("");

  const openContributeDialog = (goal: {
    id: string;
    name: string;
    nameUr?: string;
    targetAmount: number;
    currentAmount: number;
  }) => {
    setActiveGoal({
      id: goal.id,
      name: goal.nameUr ?? goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
    });
    setAmount("");
    setFieldError("");
    setDialogOpen(true);
  };

  const handleContributeSubmit = async () => {
    if (!activeGoal) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setFieldError("براہ کرم درست رقم درج کریں۔");
      return;
    }
    setSubmitting(true);
    setFieldError("");
    try {
      await contributeToGoal(activeGoal.id, parsed);
      setDialogOpen(false);
    } catch {
      setFieldError("خرابی آئی۔ دوبارہ کوشش کریں۔");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">بچت کے اہداف</h1>
          <p className="text-[14px] text-[#6B7A70]">
            {goals.length > 0
              ? `${goals.filter((g) => !g.isCompleted).length} فعال ہدف · کل جمع ${pkr(totalSaved)}`
              : "کوئی ہدف مقرر نہیں"}
          </p>
        </div>
        <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
          + نیا ہدف
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {/* ── Loading ── */}
        {loading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && <ErrorState />}

        {/* ── Empty ── */}
        {!loading && !error && goals.length === 0 && (
          <EmptyState
            icon="🎯"
            title="کوئی بچت کا ہدف نہیں"
            description="اپنا پہلا بچت کا ہدف بنائیں — مثلاً ایمرجنسی فنڈ، عمرہ، یا کوئی بڑی خریداری۔"
            actionLabel="+ نیا ہدف"
          />
        )}

        {/* ── Populated ── */}
        {!loading && !error && goals.length > 0 && (
          <>
            {/* Goal cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {goals.map((g) => {
                const pct =
                  g.targetAmount > 0
                    ? Math.round((g.currentAmount / g.targetAmount) * 100)
                    : 0;
                const barColor = g.isCompleted
                  ? "#22B07D"
                  : pct >= 60
                    ? "#0F5132"
                    : "#D8A72A";
                const badgeBg = g.isCompleted
                  ? "#E6EFE9"
                  : pct >= 60
                    ? "#E6EFE9"
                    : "#FDF3D8";
                const badgeFg = g.isCompleted
                  ? "#0F5132"
                  : pct >= 60
                    ? "#0F5132"
                    : "#6B5B2E";
                return (
                  <div
                    key={g.id}
                    className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="text-[19px] font-bold">
                        {g.nameUr ?? g.name}
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-1 font-[var(--font-manrope)] text-[12px]"
                        style={{ background: badgeBg, color: badgeFg }}
                      >
                        {g.isCompleted ? "مکمل" : `${pct}%`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-3 overflow-hidden rounded-full bg-[#EDEAE0]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: barColor,
                          }}
                        />
                      </div>
                      <div className="flex justify-between font-[var(--font-manrope)] text-[13px] text-[#4C5A52]">
                        <span>{pkr(g.currentAmount)}</span>
                        <span>{pkr(g.targetAmount)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-[7px] text-[14px] text-[#4C5A52]">
                      <div className="flex justify-between">
                        <span className="text-[#6B7A70]">ہدف کی تاریخ</span>
                        <span>
                          {g.targetDate
                            ? new Date(g.targetDate).toLocaleDateString(
                                "ur-PK",
                                {
                                  month: "long",
                                  year: "numeric",
                                },
                              )
                            : "مقرر نہیں"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openContributeDialog(g)}
                      className="rounded-[9px] border-0 bg-[#F1EEE4] py-[11px] text-[14px] hover:bg-[#E7E2D6]"
                    >
                      رقم جمع کریں
                    </button>
                  </div>
                );
              })}
            </div>

            {/* What-if scenario placeholder */}
            <div className="rounded-2xl border border-[#E7E2D6] bg-white p-6">
              <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#0F5132]">
                WHAT-IF · معاون کا حساب
              </span>
              <p className="mt-2 text-[15px] leading-[2.05] text-[#4C5A52]">
                جیسے ہی آپ کے لین دین کا ڈیٹا دستیاب ہو گا، معاون مختلف
                منظرناموں کا حساب لگا کر بتائے گا کہ آپ کے اہداف کب مکمل ہوں گے۔
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Contribute Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md border-[#E7E2D6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[18px]">رقم جمع کریں</DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {activeGoal?.name} — موجودہ: {pkr(activeGoal?.currentAmount ?? 0)}{" "}
              / {pkr(activeGoal?.targetAmount ?? 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-2">
            <label className="text-[13px] text-[#6B7A70]">رقم (PKR)</label>
            <Input
              type="number"
              placeholder="مثلاً 5000"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleContributeSubmit();
              }}
              className="h-11 text-[16px] border-[#DCD6C8] bg-[#FBF9F4] px-3.5"
              autoFocus
            />
            {fieldError && (
              <span className="text-[13px] text-[#B3261E]">{fieldError}</span>
            )}
          </div>

          <div className="flex gap-2.5 pt-3">
            <Button
              onClick={() => setDialogOpen(false)}
              variant="outline"
              className="flex-1 h-10 text-[14px] border-[#DCD6C8]"
            >
              منسوخ
            </Button>
            <Button
              onClick={handleContributeSubmit}
              disabled={submitting || !amount.trim()}
              className="flex-1 h-10 text-[14px] bg-[#0F5132] text-white hover:bg-[#14231B]"
            >
              {submitting ? "جمع ہو رہا ہے…" : "جمع کریں"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
