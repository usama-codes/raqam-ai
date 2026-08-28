"use client";

import * as React from "react";
import Link from "next/link";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/TransactionFormDialog";
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog";
import {
  useTransactions,
  type Transaction,
  type TransactionType,
  type TransactionFilters,
} from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useBudgets } from "@/hooks/useBudgets";
import { useToast } from "@/components/shared/Toast";
import { useLanguage } from "@/components/LanguageProvider";
import {
  ListSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/shared/DataStates";

const PAGE_SIZE = 20;

const gridCols =
  "grid-cols-[100px_minmax(150px,1.6fr)_minmax(120px,1fr)_110px_120px_90px]";

function pkr(n: number) {
  return `Rs. ${n.toLocaleString()}`;
}

function formatDateLocal(ms: number, locale: "ur" | "en"): string {
  const d = new Date(ms);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (locale === "ur") {
    if (diffDays === 0) return "آج";
    if (diffDays === 1) return "کل";
    return d.toLocaleDateString("ur-PK", { day: "numeric", month: "short" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

export default function TransactionsPage() {
  /* ── Filter state ── */
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"all" | TransactionType>(
    "all",
  );
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(
    [],
  );
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [showCategoryPicker, setShowCategoryPicker] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

  const { t, language } = useLanguage();

  /* ── Debounce search ── */
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── Build filter object ── */
  const filters = React.useMemo<TransactionFilters>(() => {
    const f: TransactionFilters = {};
    if (debouncedSearch) f.search = debouncedSearch;
    if (typeFilter !== "all") f.type = typeFilter;
    if (selectedCategories.length > 0) f.categoryIds = selectedCategories;
    if (dateFrom) f.dateFrom = new Date(dateFrom).getTime();
    if (dateTo) f.dateTo = new Date(dateTo).getTime() + 86_400_000;
    return f;
  }, [debouncedSearch, typeFilter, selectedCategories, dateFrom, dateTo]);

  /* ── Reset pagination when filters change ── */
  const filterKey = `${debouncedSearch}|${typeFilter}|${selectedCategories.join(",")}|${dateFrom}|${dateTo}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(filters);
  const { categories } = useCategories();
  const { budgetCategories } = useBudgets();
  const { addToast } = useToast();

  /* ── Dialog state ── */
  const [formOpen, setFormOpen] = React.useState(false);
  const [editData, setEditData] =
    React.useState<Partial<TransactionFormData>>();
  const [editId, setEditId] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    id: string;
    desc: string;
    amount: string;
  } | null>(null);

  /* ── Helpers ── */
  const getCategoryName = (catId: string): string => {
    const cat = categories.find((c) => c.id === catId || c.name === catId);
    return cat?.nameUr ?? catId;
  };

  const getSourceLabel = (source: string): string => {
    switch (source) {
      case "manual":
        return t("transactions.sourceManual");
      case "conversational":
        return t("transactions.sourceConversational");
      case "voice":
        return t("transactions.sourceVoice");
      case "receipt":
        return t("transactions.sourceReceipt");
      default:
        return t("transactions.sourceImport");
    }
  };

  const hasActiveFilters =
    typeFilter !== "all" ||
    selectedCategories.length > 0 ||
    !!debouncedSearch ||
    !!dateFrom ||
    !!dateTo;

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setSelectedCategories([]);
    setDateFrom("");
    setDateTo("");
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  const visibleTransactions = transactions.slice(0, visibleCount);
  const hasMore = transactions.length > visibleCount;

  /* ── CRUD handlers ── */
  const handleAdd = () => {
    setEditData(undefined);
    setEditId(null);
    setFormOpen(true);
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setEditData({
      type: tx.type,
      amount: String(tx.amount),
      categoryId: tx.categoryId,
      description: tx.descriptionUr ?? tx.description ?? "",
      date: new Date(tx.date).toISOString().slice(0, 10),
      notes: tx.notes ?? "",
    });
    setFormOpen(true);
  };

  const handleDelete = (tx: Transaction) => {
    setDeleteTarget({
      id: tx.id,
      desc: tx.descriptionUr ?? tx.description ?? "",
      amount: pkr(tx.amount),
    });
    setDeleteOpen(true);
  };

  const handleFormSubmit = async (data: TransactionFormData) => {
    const amount = parseFloat(data.amount);
    const dateMs = new Date(data.date).getTime();
    if (editId) {
      await updateTransaction({
        id: editId,
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    } else {
      await createTransaction({
        type: data.type,
        amount,
        categoryId: data.categoryId,
        date: dateMs,
        description: data.description,
        notes: data.notes,
        source: "manual",
      });
    }
    setFormOpen(false);

    // Budget warning check for expenses
    if (data.type === "expense") {
      const bc = budgetCategories.find((b) => b.categoryId === data.categoryId);
      if (bc && bc.limit > 0) {
        const projectedSpent = bc.spent + amount;
        const pct = Math.round((projectedSpent / bc.limit) * 100);
        const catName =
          categories.find((c) => c.id === data.categoryId)?.nameUr ?? "زمرہ";
        if (pct >= 100) {
          addToast({
            type: "error",
            title: `${catName} ${t("transactions.budgetExceeded")}`,
            description: `${pkr(projectedSpent)} / ${pkr(bc.limit)} (${pct}%)`,
          });
        } else if (pct >= 80) {
          addToast({
            type: "warning",
            title: `${catName} ${t("transactions.budgetWarning")}`,
            description: `${pkr(projectedSpent)} / ${pkr(bc.limit)} (${pct}%)`,
          });
        }
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteTransaction(deleteTarget.id);
    }
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("transactions.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">
            {transactions.length > 0
              ? `${transactions.length} ${t("transactions.entries")}${hasMore ? ` · ${visibleCount} ${t("transactions.showing")}` : ""}`
              : t("transactions.noEntries")}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/import"
            className="hidden rounded-[10px] border border-[#DCD6C8] bg-white px-4 py-[11px] text-[14px] hover:bg-[#FBF9F4] sm:block"
          >
            {t("transactions.importStatement")}
          </Link>
          <button
            onClick={handleAdd}
            className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]"
          >
            {t("transactions.add")}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 rounded-[14px] border border-[#E7E2D6] bg-white p-4 px-[18px]">
          {/* Row 1: Search + type toggle + clear */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5">
              <span className="text-[#8A9690]">⌕</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("transactions.searchPlaceholder")}
                className="flex-1 bg-transparent text-[14px] text-[#14231B] placeholder:text-[#9BA79F] focus:outline-none"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                  }}
                  className="text-[12px] text-[#8A9690] hover:text-[#4C5A52]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Type toggle */}
            <div className="flex overflow-hidden rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]">
              <button
                onClick={() => setTypeFilter("all")}
                className={`px-3.5 py-2.5 text-[14px] ${typeFilter === "all" ? "bg-[#0F5132] text-white" : ""}`}
              >
                {t("transactions.all")}
              </button>
              <button
                onClick={() =>
                  setTypeFilter(typeFilter === "expense" ? "all" : "expense")
                }
                className={`border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px] ${typeFilter === "expense" ? "bg-[#B3261E] text-white" : ""}`}
              >
                {t("transactions.expense")}
              </button>
              <button
                onClick={() =>
                  setTypeFilter(typeFilter === "income" ? "all" : "income")
                }
                className={`border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px] ${typeFilter === "income" ? "bg-[#0F5132] text-white" : ""}`}
              >
                {t("transactions.income")}
              </button>
            </div>

            {/* Category filter button */}
            <div className="relative">
              <button
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className={`rounded-[10px] border px-3.5 py-2.5 text-[14px] ${
                  selectedCategories.length > 0
                    ? "border-[#0F5132] bg-[#E6EFE9] text-[#0F5132]"
                    : "border-[#DCD6C8] bg-[#FBF9F4]"
                }`}
              >
                {t("transactions.category")}
                {selectedCategories.length > 0 && (
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0F5132] text-[11px] text-white">
                    {selectedCategories.length}
                  </span>
                )}
              </button>

              {/* Category dropdown */}
              {showCategoryPicker && (
                <div className="absolute top-full right-0 z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-[10px] border border-[#E7E2D6] bg-white p-2 shadow-lg">
                  {categories
                    .filter(
                      (c) =>
                        !c.isSystem ||
                        c.type === "expense" ||
                        c.type === "both",
                    )
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-[13px] ${
                          selectedCategories.includes(cat.id)
                            ? "bg-[#E6EFE9] text-[#0F5132]"
                            : "hover:bg-[#FBF9F4]"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="flex-1">{cat.nameUr}</span>
                        {selectedCategories.includes(cat.id) && (
                          <span className="text-[#0F5132]">✓</span>
                        )}
                      </button>
                    ))}
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="mt-1 w-full rounded-lg border-t border-[#E7E2D6] px-3 py-2 text-center text-[12px] text-[#B3261E]"
                    >
                      {t("transactions.clearAll")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[14px] text-[#B3261E] hover:underline"
              >
                {t("transactions.removeFilters")}
              </button>
            )}
          </div>

          {/* Row 2: Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[13px] text-[#6B7A70]">
              {t("transactions.dateLabel")}
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-[8px] border border-[#DCD6C8] bg-[#FBF9F4] px-2.5 text-[13px] focus:border-[#0F5132] focus:outline-none"
              dir="ltr"
            />
            <span className="text-[13px] text-[#8A9690]">
              {t("transactions.dateFrom")}
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-[8px] border border-[#DCD6C8] bg-[#FBF9F4] px-2.5 text-[13px] focus:border-[#0F5132] focus:outline-none"
              dir="ltr"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-[12px] text-[#8A9690] hover:text-[#4C5A52]"
              >
                {t("transactions.clearDate")}
              </button>
            )}
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
            <ListSkeleton rows={6} />
          </div>
        )}

        {/* ── Error ── */}
        {error && <ErrorState />}

        {/* ── Empty ── */}
        {!loading && !error && transactions.length === 0 && (
          <EmptyState
            icon="💸"
            title={
              hasActiveFilters
                ? t("transactions.noResults")
                : t("transactions.emptyTitle")
            }
            description={
              hasActiveFilters
                ? t("transactions.noResultsDesc")
                : t("transactions.emptyDesc")
            }
            actionLabel={
              hasActiveFilters
                ? t("transactions.removeFilters")
                : t("transactions.add")
            }
            onAction={hasActiveFilters ? clearFilters : handleAdd}
          />
        )}

        {/* ── Data table ── */}
        {!loading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
            {/* Table header */}
            <div
              className={`hidden min-w-[800px] ${gridCols} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
            >
              <span>{t("transactions.colDate")}</span>
              <span>{t("transactions.colDescription")}</span>
              <span>{t("transactions.colCategory")}</span>
              <span>{t("transactions.colSource")}</span>
              <span>{t("transactions.colAmount")}</span>
              <span></span>
            </div>
            {/* Table rows */}
            {visibleTransactions.map((tx, i) => (
              <div
                key={tx.id}
                className={`hidden min-w-[800px] ${gridCols} grid items-center gap-3.5 px-5 py-[15px] text-[15px] hover:bg-[#FBF9F4] md:grid ${i < visibleTransactions.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
              >
                <span className="text-[14px] text-[#6B7A70]">
                  {formatDateLocal(tx.date, language)}
                </span>
                <span>{tx.descriptionUr ?? tx.description ?? "—"}</span>
                <span className="text-[#4C5A52]">
                  {getCategoryName(tx.categoryId)}
                </span>
                <span className="justify-self-start rounded-full bg-[#F1EEE4] px-2.5 py-1 text-[12px] text-[#6B7A70]">
                  {getSourceLabel(tx.source)}
                </span>
                <span
                  className={`font-[var(--font-manrope)] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                >
                  {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                </span>
                <span className="flex gap-3 text-[14px]">
                  <button
                    onClick={() => handleEdit(tx)}
                    className="text-[#0F5132]"
                  >
                    {t("transactions.edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(tx)}
                    className="text-[#B3261E]"
                  >
                    {t("transactions.delete")}
                  </button>
                </span>
              </div>
            ))}
            {/* Mobile card layout */}
            <div className="flex flex-col md:hidden">
              {visibleTransactions.map((tx, i) => (
                <div
                  key={`m-${tx.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3 ${i < visibleTransactions.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium">
                        {tx.descriptionUr ?? tx.description ?? "—"}
                      </span>
                      <span className="rounded-full bg-[#F1EEE4] px-2 py-0.5 text-[11px] text-[#6B7A70]">
                        {getSourceLabel(tx.source)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[#8A9690]">
                        {formatDateLocal(tx.date, language)} ·{" "}
                        {getCategoryName(tx.categoryId)}
                      </span>
                      <button
                        onClick={() => handleEdit(tx)}
                        className="text-[12px] text-[#0F5132]"
                      >
                        {t("transactions.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(tx)}
                        className="text-[12px] text-[#B3261E]"
                      >
                        {t("transactions.delete")}
                      </button>
                    </div>
                  </div>
                  <span
                    className={`font-[var(--font-manrope)] text-[15px] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                  >
                    {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="border-t border-[#E7E2D6] py-3 text-center">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="rounded-[10px] border border-[#DCD6C8] bg-white px-6 py-2.5 text-[14px] text-[#0F5132] hover:bg-[#FBF9F4]"
                >
                  {t("transactions.loadMore")} (
                  {transactions.length - visibleCount}{" "}
                  {t("transactions.remaining")})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Close category picker on outside click ── */}
      {showCategoryPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowCategoryPicker(false)}
        />
      )}

      {/* ── Add / Edit Transaction Dialog ── */}
      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        initialData={editData}
        onSubmit={handleFormSubmit}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transactionDescription={deleteTarget?.desc}
        transactionAmount={deleteTarget?.amount}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
