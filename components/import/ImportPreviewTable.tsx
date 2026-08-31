"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { Category } from "@/hooks/useCategories";
import { formatPKR } from "@/lib/i18n/format";
import { inputValueToDate } from "@/lib/finance/import/normalizer";
import type {
  ImportPreviewRow,
  ImportRowEdits,
  ImportBusy,
} from "@/hooks/useImports";
import { Loader2 } from "lucide-react";

// components/import/ImportPreviewTable.tsx — Phase 12 preview table
//
// Renders every normalized row as an editable, selectable line. All edits live
// in local state and are submitted in one shot at confirm time (the mutation
// is atomic server-side). Duplicate rows default to unselected and carry a
// warning tint. Rows render 100 at a time to keep the DOM light on mobile.

// ─── Types ──────────────────────────────────────────────────────────────────────

interface RowEdit {
  rowId: string;
  selected: boolean;
  type: "income" | "expense";
  amount: string;
  description: string;
  dateInput: string;
  categoryId: string;
}

interface ImportPreviewTableProps {
  fileName: string;
  rowCount: number | null;
  duplicateCount: number | null;
  skippedCount: number | null;
  rows: ImportPreviewRow[];
  categories: Category[];
  categoriesLoading: boolean;
  busy: ImportBusy;
  onConfirm: (edits: ImportRowEdits[]) => void;
  onCancel: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function buildEdits(rows: ImportPreviewRow[]): RowEdit[] {
  return rows.map((r) => ({
    rowId: r.id,
    selected: !r.isDuplicate,
    type: r.type,
    amount: String(r.amount),
    description: r.description,
    dateInput: r.dateInput,
    categoryId: r.suggestedCategoryId ?? "",
  }));
}

function parseAmountInput(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, "").trim());
  return isFinite(n) ? n : 0;
}

// ─── Component ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

export function ImportPreviewTable({
  fileName,
  rowCount,
  duplicateCount,
  skippedCount,
  rows,
  categories,
  categoriesLoading,
  busy,
  onConfirm,
  onCancel,
}: ImportPreviewTableProps) {
  const { t, language } = useLanguage();
  const [displayLimit, setDisplayLimit] = React.useState(PAGE_SIZE);

  // Edit state initializes once per mount. The parent remounts this component
  // with a `key` per import, so a new preview always starts fresh while an
  // in-progress preview never loses user edits to reactive query re-emits.
  const [edits, setEdits] = React.useState<RowEdit[]>(() => buildEdits(rows));

  const updateEdit = React.useCallback(
    (rowId: string, patch: Partial<RowEdit>) => {
      setEdits((prev) =>
        prev.map((e) => (e.rowId === rowId ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  // Categories compatible with a row's current type.
  const categoriesForType = React.useCallback(
    (type: "income" | "expense") =>
      categories.filter((c) => c.type === "both" || c.type === type),
    [categories],
  );

  // ── Derived validation + totals ─────────────────────────────────────────────

  const invalidCount = React.useMemo(() => {
    return edits.filter((e) => {
      if (!e.selected) return false;
      const valid =
        parseAmountInput(e.amount) > 0 &&
        inputValueToDate(e.dateInput) !== null &&
        e.categoryId !== "" &&
        categories.some((c) => c.id === e.categoryId);
      return !valid;
    }).length;
  }, [edits, categories]);

  const selectedSummary = React.useMemo(() => {
    let count = 0;
    let income = 0;
    let expense = 0;
    for (const e of edits) {
      if (!e.selected) continue;
      count++;
      const amount = parseAmountInput(e.amount);
      if (e.type === "income") income += amount;
      else expense += amount;
    }
    return { count, income, expense };
  }, [edits]);

  const handleTypeChange = React.useCallback(
    (rowId: string, type: "income" | "expense") => {
      setEdits((prev) =>
        prev.map((e) => {
          if (e.rowId !== rowId) return e;
          // Keep the category only if it fits the new type.
          const stillValid = categories.some(
            (c) =>
              c.id === e.categoryId && (c.type === "both" || c.type === type),
          );
          const fallback =
            categories.find((c) => c.type === "both" || c.type === type)?.id ??
            "";
          return {
            ...e,
            type,
            categoryId: stillValid ? e.categoryId : fallback,
          };
        }),
      );
    },
    [categories],
  );

  const handleConfirm = React.useCallback(() => {
    if (invalidCount > 0 || busy || categoriesLoading) return;
    const payload: ImportRowEdits[] = edits.map((e) => ({
      rowId: e.rowId,
      type: e.type,
      amount: parseAmountInput(e.amount),
      description: e.description,
      dateMs: inputValueToDate(e.dateInput) ?? 0,
      categoryId: e.categoryId,
      selected: e.selected,
    }));
    onConfirm(payload);
  }, [invalidCount, busy, categoriesLoading, edits, onConfirm]);

  const confirmDisabled =
    busy !== null || categoriesLoading || invalidCount > 0;

  const duplicateRowIds = React.useMemo(
    () => new Set(rows.filter((r) => r.isDuplicate).map((r) => r.id)),
    [rows],
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  const inputClass =
    "w-full rounded-lg border border-[#DCD6C8] bg-[#FBF9F4] px-2.5 py-1.5 text-[13px] focus:border-[#0F5132] focus:outline-none";
  const invalidClass = "border-[#B3261E] bg-[#FDE8E8]";
  const cellClass = "px-2 py-2 align-middle";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[#F4F1E8] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[18px] font-bold">{t("import.previewTitle")}</h3>
          <span className="rounded-full bg-[#F1EEE4] px-2.5 py-0.5 text-[12px] text-[#4C5A52]">
            {fileName}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#6B7A70]">
          <span>
            {t("import.rowsLabel")}: {rowCount ?? rows.length}
          </span>
          {duplicateCount != null && duplicateCount > 0 && (
            <span className="text-[#B07D2A]">
              {t("import.duplicate")}: {duplicateCount}
            </span>
          )}
          {skippedCount != null && skippedCount > 0 && (
            <span>
              {t("import.skippedRowsPrefix")}
              {skippedCount}
              {t("import.skippedRowsSuffix")}
            </span>
          )}
        </div>
        {duplicateCount != null && duplicateCount > 0 && (
          <p className="text-[12px] text-[#6B7A70]">
            {t("import.duplicateHint")}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-2">
        <table className="w-full min-w-[680px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#E7E2D6] text-[12px] text-[#6B7A70]">
              <th className="w-10 px-2 py-2 text-start font-medium">
                <span className="sr-only">{t("import.selectRow")}</span>✓
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colDate")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colDescription")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colAmount")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colType")}
              </th>
              <th className="px-2 py-2 text-start font-medium">
                {t("import.colCategory")}
              </th>
            </tr>
          </thead>
          <tbody>
            {edits.slice(0, displayLimit).map((e) => {
              const amountInvalid =
                e.selected && parseAmountInput(e.amount) <= 0;
              const dateInvalid =
                e.selected && inputValueToDate(e.dateInput) === null;
              const categoryInvalid =
                e.selected &&
                (e.categoryId === "" ||
                  !categories.some((c) => c.id === e.categoryId));
              const isDuplicate = duplicateRowIds.has(e.rowId);

              return (
                <tr
                  key={e.rowId}
                  className={`border-b border-[#F4F1E8] ${
                    isDuplicate ? "bg-[#FDF6E3]" : ""
                  }`}
                >
                  <td className={cellClass}>
                    <input
                      type="checkbox"
                      checked={e.selected}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { selected: ev.target.checked })
                      }
                      className="h-4 w-4 cursor-pointer accent-[#0F5132]"
                      aria-label={t("import.selectRow")}
                    />
                    {isDuplicate && (
                      <span className="mt-1 block text-center text-[10px] leading-tight text-[#B07D2A]">
                        {t("import.duplicate")}
                      </span>
                    )}
                  </td>
                  <td className={cellClass}>
                    <input
                      type="date"
                      value={e.dateInput}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { dateInput: ev.target.value })
                      }
                      dir="ltr"
                      className={`${inputClass} min-w-[130px] ${
                        dateInvalid ? invalidClass : ""
                      }`}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="text"
                      value={e.description}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { description: ev.target.value })
                      }
                      dir="auto"
                      className={`${inputClass} min-w-[160px]`}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={e.amount}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { amount: ev.target.value })
                      }
                      dir="ltr"
                      className={`${inputClass} min-w-[100px] ${
                        amountInvalid ? invalidClass : ""
                      }`}
                    />
                  </td>
                  <td className={cellClass}>
                    <select
                      value={e.type}
                      onChange={(ev) =>
                        handleTypeChange(
                          e.rowId,
                          ev.target.value as "income" | "expense",
                        )
                      }
                      className={`${inputClass} min-w-[96px] ${
                        e.type === "income"
                          ? "text-[#1B7A4B]"
                          : "text-[#B3261E]"
                      }`}
                    >
                      <option value="expense">
                        {t("transactions.expense")}
                      </option>
                      <option value="income">{t("transactions.income")}</option>
                    </select>
                  </td>
                  <td className={cellClass}>
                    <select
                      value={e.categoryId}
                      onChange={(ev) =>
                        updateEdit(e.rowId, { categoryId: ev.target.value })
                      }
                      className={`${inputClass} min-w-[130px] ${
                        categoryInvalid ? invalidClass : ""
                      }`}
                    >
                      <option value="">
                        {categoriesLoading
                          ? t("common.loading")
                          : t("import.pickCategory")}
                      </option>
                      {categoriesForType(e.type).map((c) => (
                        <option key={c.id} value={c.id}>
                          {language === "ur" ? c.nameUr : c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show more */}
      {edits.length > displayLimit && (
        <div className="px-5">
          <button
            onClick={() => setDisplayLimit((n) => n + PAGE_SIZE)}
            className="rounded-[9px] border-0 bg-[#F1EEE4] px-4 py-2 text-[13px] text-[#4C5A52] hover:bg-[#E9E4D5]"
          >
            {t("import.showMore")} ({edits.length - displayLimit})
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-[#F4F1E8] px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#4C5A52]">
          <span className="font-semibold">
            {t("import.selectedPrefix")}
            {selectedSummary.count}
            {t("import.selectedSuffix")}
            {edits.length}
          </span>
          {selectedSummary.income > 0 && (
            <span className="text-[#1B7A4B]">
              {t("transactions.income")}: {formatPKR(selectedSummary.income)}
            </span>
          )}
          {selectedSummary.expense > 0 && (
            <span className="text-[#B3261E]">
              {t("transactions.expense")}: {formatPKR(selectedSummary.expense)}
            </span>
          )}
        </div>

        {invalidCount > 0 && (
          <p className="text-[13px] text-[#B3261E]" role="alert">
            {t("import.fixRowsPrefix")}
            {invalidCount}
            {t("import.fixRowsSuffix")}
          </p>
        )}

        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy !== null}
            className="flex-1 rounded-lg bg-[#F1EEE4] px-4 py-2.5 text-[14px] text-[#6B7A70] hover:bg-[#E9E4D5] disabled:opacity-50"
          >
            {busy === "cancelling" ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              t("import.cancelImport")
            )}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirmDisabled || selectedSummary.count === 0}
            className="flex-1 rounded-lg bg-[#0F5132] px-4 py-2.5 text-[14px] text-white hover:bg-[#14231B] disabled:opacity-50"
          >
            {busy === "confirming" ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              `${t("import.confirmImport")} (${selectedSummary.count})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
