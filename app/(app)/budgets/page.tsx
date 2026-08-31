"use client";

import * as React from "react";
import { useBudgets } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { useToast } from "@/components/shared/Toast";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ListSkeleton,
  EmptyState,
  ErrorState,
  ChartSkeleton,
} from "@/components/shared/DataStates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { RecurringBillsSection } from "@/components/budgets/RecurringBillsSection";

const tblGrid =
  "grid-cols-[minmax(140px,1.3fr)_130px_minmax(120px,1fr)_100px_50px]";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function getBarColor(pct: number): string {
  if (pct >= 100) return "#B3261E";
  if (pct >= 80) return "#C4622D";
  if (pct >= 60) return "#D8A72A";
  return "#22B07D";
}

function getFirstOfMonth(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

const inputCls =
  "h-10 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] placeholder:text-[#9BA79F] focus-visible:border-[#0F5132] focus-visible:ring-2 focus-visible:ring-[#0F5132]/20";
const labelCls = "text-[13px] font-medium text-[#4C5A52] mb-1.5";
const errorCls = "text-[12px] text-[#B3261E] mt-1";

export default function BudgetsPage() {
  const {
    budget,
    budgetCategories,
    loading,
    error,
    createBudget,
    upsertBudgetCategory,
    deleteBudgetCategory,
  } = useBudgets();
  const { categories } = useCategories();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const getCategoryName = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId || c.name === catId);
    return cat?.nameUr ?? catId;
  };

  const totalLimit = budget?.totalLimit ?? 0;
  const totalSpent = budgetCategories.reduce((sum, b) => sum + b.spent, 0);
  const overallPct =
    totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const hasBudget = !!budget;

  /* ── Budget creation dialog ── */
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createLimit, setCreateLimit] = React.useState("");
  const [createSubmitting, setCreateSubmitting] = React.useState(false);

  const handleCreateBudget = async () => {
    setCreateSubmitting(true);
    try {
      const limit = createLimit ? parseFloat(createLimit) : undefined;
      if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        addToast({ type: "error", title: t("budgets.toast.invalidAmount") });
        return;
      }
      await createBudget(getFirstOfMonth(), limit);
      setCreateOpen(false);
      setCreateLimit("");
      addToast({ type: "success", title: t("budgets.toast.created") });
    } catch {
      addToast({ type: "error", title: t("budgets.toast.error") });
    } finally {
      setCreateSubmitting(false);
    }
  };

  /* ── Category add/edit dialog ── */
  const [catDialogOpen, setCatDialogOpen] = React.useState(false);
  const [catSelectedId, setCatSelectedId] = React.useState("");
  const [catLimit, setCatLimit] = React.useState("");
  const [catSubmitting, setCatSubmitting] = React.useState(false);
  const [catErrors, setCatErrors] = React.useState<Record<string, string>>({});
  const [editingCatId, setEditingCatId] = React.useState<string | null>(null);

  const availableCategories = categories.filter(
    (c) =>
      (c.type === "expense" || c.type === "both") &&
      !budgetCategories.some((bc) => bc.categoryId === c.id),
  );

  const openAddCategory = () => {
    setEditingCatId(null);
    setCatSelectedId("");
    setCatLimit("");
    setCatErrors({});
    setCatDialogOpen(true);
  };

  const openEditCategory = (bc: { categoryId: string; limit: number }) => {
    setEditingCatId(bc.categoryId);
    setCatSelectedId(bc.categoryId);
    setCatLimit(String(bc.limit));
    setCatErrors({});
    setCatDialogOpen(true);
  };

  const handleUpsertCategory = async () => {
    const errs: Record<string, string> = {};
    if (!catSelectedId) errs.category = t("budgets.errorSelectCategory");
    const parsed = parseFloat(catLimit);
    if (!catLimit || isNaN(parsed) || parsed <= 0)
      errs.limit = t("budgets.toast.invalidAmount");
    if (Object.keys(errs).length > 0) {
      setCatErrors(errs);
      return;
    }
    setCatSubmitting(true);
    try {
      await upsertBudgetCategory(catSelectedId, parsed);
      setCatDialogOpen(false);
      addToast({ type: "success", title: t("budgets.toast.categorySaved") });
    } catch {
      addToast({ type: "error", title: t("budgets.toast.error") });
    } finally {
      setCatSubmitting(false);
    }
  };

  /* ── Category delete confirmation ── */
  const [deleteCatOpen, setDeleteCatOpen] = React.useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = React.useState<{
    categoryId: string;
    name: string;
  } | null>(null);

  const handleDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    try {
      await deleteBudgetCategory(deleteCatTarget.categoryId);
      addToast({ type: "success", title: t("budgets.toast.categoryDeleted") });
    } catch {
      addToast({ type: "error", title: t("budgets.toast.errorGeneric") });
    }
    setDeleteCatOpen(false);
    setDeleteCatTarget(null);
  };

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("budgets.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">
            {budgetCategories.length > 0
              ? `${t("budgets.totalLimit")} ${pkr(totalLimit)} · ${t("budgets.totalSpent")} ${pkr(totalSpent)}`
              : hasBudget
                ? `${t("budgets.totalLimit")} ${pkr(totalLimit)} · ${t("budgets.noCategories")}`
                : t("budgets.noBudget")}
          </p>
        </div>
        {hasBudget ? (
          <button
            onClick={openAddCategory}
            className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
          >
            {t("budgets.addCategory")}
          </button>
        ) : (
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
          >
            {t("budgets.create")}
          </button>
        )}
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
      {!loading && !error && !hasBudget && (
        <div className="px-6 pb-12 pt-6 sm:px-10">
          <EmptyState
            icon="📊"
            title={t("budgets.emptyTitle")}
            description={t("budgets.emptyDesc")}
            actionLabel={t("budgets.create")}
            onAction={() => setCreateOpen(true)}
          />
        </div>
      )}

      {/* ── Budget exists but no categories yet ── */}
      {!loading && !error && hasBudget && budgetCategories.length === 0 && (
        <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-6 sm:px-10">
          <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] text-[#6B7A70]">
                  {t("budgets.totalLimit")}
                </span>
                <span className="font-[var(--font-manrope)] text-[32px] font-extrabold">
                  {pkr(totalLimit)}
                </span>
              </div>
            </div>
            <p className="text-[14px] leading-[2] text-[#6B7A70]">
              {t("budgets.noBudgetDesc")}
            </p>
            <button
              onClick={openAddCategory}
              className="w-fit rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
            >
              {t("budgets.addCategory")}
            </button>
          </div>
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
                    {t("budgets.overallUtilization")}
                  </span>
                  <span className="font-[var(--font-manrope)] text-[32px] font-extrabold">
                    {overallPct}%
                  </span>
                </div>
                <span className="text-[14px] text-[#6B7A70]">
                  {pkr(Math.max(totalLimit - totalSpent, 0))}{" "}
                  {t("budgets.remaining")}
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
                  { c: "#22B07D", l: t("budgets.legendSafe") },
                  { c: "#D8A72A", l: t("budgets.legendWatch") },
                  { c: "#C4622D", l: t("budgets.legendWarning") },
                  { c: "#B3261E", l: t("budgets.legendOver") },
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
                className={`hidden min-w-[700px] ${tblGrid} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
              >
                <span>{t("budgets.colCategory")}</span>
                <span>{t("budgets.colLimit")}</span>
                <span>{t("budgets.colUtilization")}</span>
                <span>{t("budgets.colRemaining")}</span>
                <span></span>
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
                      className={`hidden min-w-[700px] ${tblGrid} grid items-center gap-3.5 px-5 py-4 md:grid ${i < budgetCategories.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                    >
                      <span className="text-[15px]">
                        {getCategoryName(row.categoryId)}
                      </span>
                      <span className="font-[var(--font-manrope)] text-[14px]">
                        {pkr(row.limit)}
                      </span>
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
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            openEditCategory({
                              categoryId: row.categoryId,
                              limit: row.limit,
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E2D6] text-[#0F5132] transition-colors hover:border-[#0F5132] hover:bg-[#E6EFE9]"
                          aria-label={t("common.edit")}
                          title={t("common.edit")}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteCatTarget({
                              categoryId: row.categoryId,
                              name: getCategoryName(row.categoryId),
                            });
                            setDeleteCatOpen(true);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E7E2D6] text-[#B3261E] transition-colors hover:border-[#B3261E] hover:bg-[#FDE8E8]"
                          aria-label={t("common.delete")}
                          title={t("common.delete")}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            <line x1="10" x2="10" y1="11" y2="17" />
                            <line x1="14" x2="14" y1="11" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Mobile card */}
                    <div
                      className={`px-4 py-3 md:hidden ${i < budgetCategories.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                    >
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="font-medium">
                          {getCategoryName(row.categoryId)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-[var(--font-manrope)] text-[12px]"
                            style={{ color: barColor }}
                          >
                            {pct}%
                          </span>
                          <button
                            onClick={() =>
                              openEditCategory({
                                categoryId: row.categoryId,
                                limit: row.limit,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-[#E7E2D6] px-2 py-1 text-[11px] text-[#0F5132] transition-colors hover:border-[#0F5132] hover:bg-[#E6EFE9]"
                            aria-label={t("common.edit")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                            {t("common.edit")}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteCatTarget({
                                categoryId: row.categoryId,
                                name: getCategoryName(row.categoryId),
                              });
                              setDeleteCatOpen(true);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-[#E7E2D6] px-2 py-1 text-[11px] text-[#B3261E] transition-colors hover:border-[#B3261E] hover:bg-[#FDE8E8]"
                            aria-label={t("common.delete")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                            {t("common.delete")}
                          </button>
                        </div>
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
                        <span>
                          {t("budgets.limitLabel")}: {pkr(row.limit)}
                        </span>
                        <span>
                          {t("budgets.remainingLabel")}: {pkr(remaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">
            {/* AI Recommendation */}
            <div className="flex flex-col gap-3.5 rounded-2xl bg-[#0F5132] p-[22px] text-[#EAF1EB]">
              <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#E8B931]">
                {t("budgets.aiRecommendation")}
              </span>
              <h2 className="text-[19px] font-bold leading-[1.85]">
                {t("budgets.aiTitle")}
              </h2>
              <p className="text-[15px] leading-[2.05] text-[#CBDDD1]">
                {t("budgets.aiDesc")}
              </p>
            </div>

            {/* Budget vs actual */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h3 className="text-[18px] font-bold">{t("budgets.vsActual")}</h3>
              <p className="text-[14px] leading-[2] text-[#6B7A70]">
                {t("budgets.vsActualDesc")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Recurring bills (Phase 13) — shown for every non-loading state ── */}
      {!loading && !error && (
        <div className="px-6 pb-12 pt-2 sm:px-10">
          <RecurringBillsSection />
        </div>
      )}

      {/* ── Budget Creation Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md border-[#E7E2D6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {t("budgets.dialog.createTitle")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {t("budgets.dialog.createDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Label className={labelCls}>
              {t("budgets.dialog.totalLimit")}{" "}
              <span className="text-[#9BA79F] font-normal">
                ({t("budgets.dialog.optional")})
              </span>
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 50,000"
              value={createLimit}
              onChange={(e) => setCreateLimit(e.target.value)}
              className={inputCls}
              dir="ltr"
            />
          </div>
          <DialogFooter className="flex-row gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-[10px] border-[#DCD6C8] bg-white text-[14px]"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreateBudget}
              disabled={createSubmitting}
              className="rounded-[10px] border-0 bg-[#0F5132] px-6 text-[14px] text-white hover:bg-[#14231B]"
            >
              {createSubmitting
                ? t("budgets.dialog.creating")
                : t("budgets.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Add/Edit Dialog ── */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-md border-[#E7E2D6] bg-white">
          <DialogHeader>
            <DialogTitle className="text-[18px]">
              {editingCatId
                ? t("budgets.dialog.categoryEditTitle")
                : t("budgets.dialog.categoryAddTitle")}
            </DialogTitle>
            <DialogDescription className="text-[14px] text-[#6B7A70]">
              {editingCatId
                ? t("budgets.dialog.categoryEditDesc")
                : t("budgets.dialog.categoryAddDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            {!editingCatId && (
              <div className="flex flex-col gap-1.5">
                <Label className={labelCls}>{t("budgets.colCategory")}</Label>
                <Select
                  value={catSelectedId}
                  onValueChange={(val) => {
                    if (val) setCatSelectedId(val);
                    setCatErrors((e) => {
                      const copy = { ...e };
                      delete copy.category;
                      return copy;
                    });
                  }}
                >
                  <SelectTrigger
                    className={`h-10 w-full rounded-[10px] border bg-[#FBF9F4] px-3.5 text-[14px] ${catErrors.category ? "border-[#B3261E]" : "border-[#DCD6C8]"}`}
                  >
                    <SelectValue
                      placeholder={t("transactions.form.categoryPlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.nameUr}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {catErrors.category && (
                  <span className={errorCls}>{catErrors.category}</span>
                )}
              </div>
            )}

            {editingCatId && (
              <div className="flex flex-col gap-1.5">
                <Label className={labelCls}>{t("budgets.colCategory")}</Label>
                <div className="h-10 rounded-[10px] border border-[#DCD6C8] bg-[#F1EEE4] px-3.5 text-[14px] flex items-center text-[#4C5A52]">
                  {getCategoryName(editingCatId)}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label className={labelCls}>
                {t("budgets.dialog.monthlyLimit")}
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 10,000"
                value={catLimit}
                onChange={(e) => {
                  setCatLimit(e.target.value);
                  setCatErrors((err) => {
                    const copy = { ...err };
                    delete copy.limit;
                    return copy;
                  });
                }}
                className={`${inputCls} ${catErrors.limit ? "border-[#B3261E]" : ""}`}
                dir="ltr"
              />
              {catErrors.limit && (
                <span className={errorCls}>{catErrors.limit}</span>
              )}
            </div>
          </div>
          <DialogFooter className="flex-row gap-2.5 pt-3">
            <Button
              variant="outline"
              onClick={() => setCatDialogOpen(false)}
              className="rounded-[10px] border-[#DCD6C8] bg-white text-[14px]"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleUpsertCategory}
              disabled={catSubmitting}
              className="rounded-[10px] border-0 bg-[#0F5132] px-6 text-[14px] text-white hover:bg-[#14231B]"
            >
              {catSubmitting ? t("budgets.dialog.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Delete Confirmation ── */}
      <AlertDialog open={deleteCatOpen} onOpenChange={setDeleteCatOpen}>
        <AlertDialogContent className="border-[#E7E2D6] bg-white sm:max-w-sm">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle className="text-[18px] font-bold text-[#14231B]">
              {t("budgets.dialog.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] leading-[2] text-[#6B7A70]">
              {deleteCatTarget && (
                <span className="block font-medium text-[#14231B]">
                  {deleteCatTarget.name}
                </span>
              )}
              {t("budgets.dialog.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2.5">
            <AlertDialogCancel
              onClick={() => setDeleteCatOpen(false)}
              className="rounded-[10px] border-[#DCD6C8] bg-white text-[14px] hover:bg-[#FBF9F4]"
            >
              {t("transactions.delete.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="rounded-[10px] border-0 bg-[#B3261E] text-[14px] text-white hover:bg-[#8C1E18]"
            >
              {t("transactions.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
