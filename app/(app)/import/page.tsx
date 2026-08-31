"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/shared/Toast";
import {
  useImports,
  ImportError,
  type ImportErrorCode,
  type ImportRecord,
  type ImportRowEdits,
} from "@/hooks/useImports";
import { useCategories } from "@/hooks/useCategories";
import { ImportPreviewTable } from "@/components/import/ImportPreviewTable";
import { EmptyState, ListSkeleton } from "@/components/shared/DataStates";
import { formatDate } from "@/lib/i18n/format";
import type { TranslationKey } from "@/lib/i18n/ur";
import { FileUp, Loader2 } from "lucide-react";

// app/(app)/import/page.tsx — Bank statement import (Phase 12)
//
// Upload CSV → server-side preview (editable, duplicate-flagged) → atomic
// confirm into transactions. Nothing persists before the user reviews.

// ─── Error code → localized message ─────────────────────────────────────────────

const ERROR_KEYS: Record<ImportErrorCode, TranslationKey> = {
  unsupportedType: "import.error.unsupportedType",
  fileTooLarge: "import.error.fileTooLarge",
  tooManyRows: "import.error.tooManyRows",
  csvEmpty: "import.error.csvEmpty",
  csvEncoding: "import.error.csvEncoding",
  csvNoHeaders: "import.error.csvNoHeaders",
  csvNoRows: "import.error.csvNoRows",
  csvMalformed: "import.error.csvMalformed",
  missingColumns: "import.error.missingColumns",
  noValidRows: "import.error.noValidRows",
  server: "import.error.server",
};

// ─── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  preview: "bg-[#FDF3D8] text-[#B07D2A] border-[#D8A72A]/30",
  confirmed: "bg-[#E6EFE9] text-[#1B7A4B] border-[#22B07D]/30",
  failed: "bg-[#FDE8E8] text-[#B3261E] border-[#B3261E]/20",
};

function StatusBadge({ status }: { status: ImportRecord["status"] }) {
  const { t } = useLanguage();
  const label =
    status === "preview"
      ? t("import.status.preview")
      : status === "confirmed"
        ? t("import.status.confirmed")
        : status === "failed"
          ? t("import.status.failed")
          : status;
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
        STATUS_STYLES[status] ?? "border-[#E7E2D6] bg-[#F1EEE4] text-[#6B7A70]"
      }`}
    >
      {label}
    </span>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { t, language } = useLanguage();
  const { addToast } = useToast();

  const {
    imports,
    importsLoading,
    preview,
    previewLoading,
    openPreview,
    busy,
    uploadFile,
    confirm,
    cancel,
  } = useImports();
  const { categories, loading: categoriesLoading } = useCategories();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const showError = React.useCallback(
    (err: unknown) => {
      if (err instanceof ImportError) {
        addToast({
          type: "error",
          title: t("common.errorTitle"),
          description: t(ERROR_KEYS[err.code]),
        });
      } else {
        addToast({
          type: "error",
          title: t("common.errorTitle"),
          description: t("import.error.server"),
        });
      }
    },
    [addToast, t],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
    } catch (err) {
      showError(err);
    } finally {
      // Reset so the same file can be re-selected after fixing it.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirm = async (edits: ImportRowEdits[]) => {
    try {
      const count = await confirm(edits);
      addToast({
        type: "success",
        title: t("import.successTitle"),
        description: `${t("import.successDescPrefix")}${count}${t("import.successDescSuffix")}`,
      });
    } catch (err) {
      showError(err);
    }
  };

  const handleCancel = async (importId?: string) => {
    try {
      await cancel(importId);
      addToast({
        type: "info",
        title: t("import.cancelled"),
      });
    } catch (err) {
      showError(err);
    }
  };

  const locale = language === "ur" ? "ur" : "en";

  return (
    <div>
      <header className="sticky top-0 z-[5] flex flex-col gap-4 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("import.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">{t("import.subtitle")}</p>
        </div>
      </header>

      <div className="flex flex-col gap-8 px-6 py-7 sm:px-10">
        {/* Preview (active import) or upload card */}
        {previewLoading && !preview ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#E7E2D6] bg-white px-6 py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[#0F5132]" />
            <span className="text-[14px] text-[#6B7A70]">
              {t("common.loading")}
            </span>
          </div>
        ) : preview ? (
          <ImportPreviewTable
            key={preview.import.id}
            fileName={preview.import.fileName}
            rowCount={preview.import.rowCount}
            duplicateCount={preview.import.duplicateCount}
            skippedCount={preview.import.skippedCount}
            rows={preview.rows}
            categories={categories}
            categoriesLoading={categoriesLoading}
            busy={busy}
            onConfirm={handleConfirm}
            onCancel={() => handleCancel()}
          />
        ) : (
          <div
            onClick={() => {
              if (busy !== "uploading") fileInputRef.current?.click();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                if (busy !== "uploading") fileInputRef.current?.click();
              }
            }}
            className={`flex flex-col items-start gap-2.5 rounded-2xl border border-dashed border-[#CBD9CF] bg-white p-6 transition-colors ${
              busy === "uploading"
                ? "cursor-wait opacity-70"
                : "cursor-pointer hover:border-[#0F5132] hover:bg-[#FBF9F4]"
            }`}
          >
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
              {t("import.uploadLabel")}
            </span>
            <h3 className="text-[18px] font-bold">{t("import.uploadTitle")}</h3>
            <p className="text-[14px] leading-[2] text-[#6B7A70]">
              {t("import.uploadDesc")}
            </p>
            <div className="mt-1 flex items-center gap-2 rounded-[9px] border-0 bg-[#0F5132] px-4 py-2.5 text-[14px] text-white">
              {busy === "uploading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("import.uploading")}
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  {t("import.selectFile")}
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,application/csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* History */}
        <section className="flex flex-col gap-4">
          <h2 className="text-[18px] font-bold">{t("import.historyTitle")}</h2>
          {importsLoading ? (
            <ListSkeleton rows={3} />
          ) : imports.length === 0 ? (
            <EmptyState
              icon="📥"
              title={t("import.historyEmptyTitle")}
              description={t("import.historyEmptyDesc")}
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E7E2D6] bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">
                        {imp.fileName}
                      </span>
                      <StatusBadge status={imp.status} />
                    </div>
                    <span className="text-[12px] text-[#6B7A70]">
                      {formatDate(imp.createdAt, locale)}
                      {imp.rowCount != null &&
                        ` · ${t("import.rowsLabel")}: ${imp.rowCount}`}
                      {imp.importedCount != null &&
                        ` · ${t("import.importedLabel")}: ${imp.importedCount}`}
                      {imp.duplicateCount != null &&
                        imp.duplicateCount > 0 &&
                        ` · ${t("import.duplicate")}: ${imp.duplicateCount}`}
                    </span>
                  </div>
                  {imp.status === "preview" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => openPreview(imp.id)}
                        disabled={busy !== null}
                        className="rounded-lg bg-[#0F5132] px-3.5 py-2 text-[13px] text-white hover:bg-[#14231B] disabled:opacity-50"
                      >
                        {t("import.resume")}
                      </button>
                      <button
                        onClick={() => handleCancel(imp.id)}
                        disabled={busy !== null}
                        className="rounded-lg bg-[#F1EEE4] px-3.5 py-2 text-[13px] text-[#6B7A70] hover:bg-[#E9E4D5] disabled:opacity-50"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
