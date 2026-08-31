"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseCSV, CSVParseError } from "@/lib/finance/import/csv";
import {
  MAX_IMPORT_ROWS,
  detectColumns,
  mappingIsValid,
  missingColumnRoles,
  normalizeRows,
  dateToInputValue,
} from "@/lib/finance/import/normalizer";

// hooks/useImports.ts — Import pipeline orchestration (Phase 12)
//
// Owns the client side of the statement import flow: file validation, CSV
// parsing + normalization (papaparse and the date parser run here, never in
// Convex — dates must become local-midnight Unix ms like manual entries),
// best-effort raw-file upload to Convex storage, preview creation, and
// confirm/cancel. The page maps the stable ImportErrorCode values onto
// localized strings.

// ─── Constants ──────────────────────────────────────────────────────────────────

/** AGENTS.md §12: 5 MB limit for CSV uploads. */
const MAX_CSV_BYTES = 5 * 1024 * 1024;

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ImportRecord {
  id: string;
  fileName: string;
  fileType: "csv" | "pdf" | "xlsx";
  status: "uploaded" | "parsing" | "preview" | "confirmed" | "failed";
  rowCount: number | null;
  importedCount: number | null;
  duplicateCount: number | null;
  skippedCount: number | null;
  createdAt: number;
}

export interface ImportPreviewRow {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  dateInput: string;
  suggestedCategoryId: string | null;
  isDuplicate: boolean;
}

export interface ImportPreview {
  import: ImportRecord;
  rows: ImportPreviewRow[];
}

/** Final, user-edited state of one preview row at confirm time. */
export interface ImportRowEdits {
  rowId: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  dateMs: number;
  categoryId: string;
  selected: boolean;
}

/** Stable error codes — the page maps these onto localized strings. */
export type ImportErrorCode =
  | "unsupportedType"
  | "fileTooLarge"
  | "tooManyRows"
  | "csvEmpty"
  | "csvEncoding"
  | "csvNoHeaders"
  | "csvNoRows"
  | "csvMalformed"
  | "missingColumns"
  | "noValidRows"
  | "server";

export class ImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}

export type ImportBusy = "uploading" | "confirming" | "cancelling" | null;

// ─── Raw Convex document shapes ─────────────────────────────────────────────────

interface RawImportDoc {
  _id: string;
  fileName: string;
  fileType: "csv" | "pdf" | "xlsx";
  status: "uploaded" | "parsing" | "preview" | "confirmed" | "failed";
  rowCount?: number;
  importedCount?: number;
  duplicateCount?: number;
  skippedCount?: number;
  createdAt: number;
}

interface RawPreviewRowDoc {
  _id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: number;
  suggestedCategoryId: string | null;
  isDuplicate: boolean;
}

// ─── Error mapping ──────────────────────────────────────────────────────────────

const CSV_ERROR_CODES: Record<CSVParseError["code"], ImportErrorCode> = {
  empty: "csvEmpty",
  encoding: "csvEncoding",
  "no-headers": "csvNoHeaders",
  "no-rows": "csvNoRows",
  malformed: "csvMalformed",
};

/** Translate known server rejection messages into stable client codes. */
function mapServerError(err: unknown): ImportErrorCode | null {
  const message = err instanceof Error ? err.message : String(err);
  if (message.startsWith("Only CSV")) return "unsupportedType";
  if (message.startsWith("Could not detect required columns")) {
    return "missingColumns";
  }
  if (message.startsWith("No valid transactions")) return "noValidRows";
  if (message.startsWith("No data rows")) return "csvNoRows";
  if (message.startsWith("Too many rows")) return "tooManyRows";
  return null;
}

function toImportError(err: unknown): ImportErrorCode {
  if (err instanceof CSVParseError) return CSV_ERROR_CODES[err.code];
  return mapServerError(err) ?? "server";
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useImports() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;

  const [activeImportId, setActiveImportId] = React.useState<string | null>(
    null,
  );
  const [busy, setBusy] = React.useState<ImportBusy>(null);

  const rawImports = useQuery(typedApi.imports.list);
  const rawPreview = useQuery(
    typedApi.imports.getPreview,
    activeImportId ? { importId: activeImportId } : "skip",
  );

  const generateUploadUrl = useMutation(typedApi.imports.generateUploadUrl);
  const createPreview = useMutation(typedApi.imports.createPreview);
  const confirmMutation = useMutation(typedApi.imports.confirmImport);
  const cancelMutation = useMutation(typedApi.imports.cancelImport);

  const imports: ImportRecord[] = React.useMemo(() => {
    if (!rawImports) return [];
    return (rawImports as RawImportDoc[]).map((i) => ({
      id: i._id,
      fileName: i.fileName,
      fileType: i.fileType,
      status: i.status,
      rowCount: i.rowCount ?? null,
      importedCount: i.importedCount ?? null,
      duplicateCount: i.duplicateCount ?? null,
      skippedCount: i.skippedCount ?? null,
      createdAt: i.createdAt,
    }));
  }, [rawImports]);

  const preview: ImportPreview | null = React.useMemo(() => {
    if (!rawPreview || !activeImportId) return null;
    const p = rawPreview as {
      import: RawImportDoc;
      rows: RawPreviewRowDoc[];
    };
    return {
      import: {
        id: p.import._id,
        fileName: p.import.fileName,
        fileType: p.import.fileType,
        status: p.import.status,
        rowCount: p.import.rowCount ?? null,
        importedCount: p.import.importedCount ?? null,
        duplicateCount: p.import.duplicateCount ?? null,
        skippedCount: p.import.skippedCount ?? null,
        createdAt: p.import.createdAt,
      },
      rows: p.rows.map((r) => ({
        id: r._id,
        type: r.type,
        amount: r.amount,
        description: r.description,
        // Format the calendar date CLIENT-side so "YYYY-MM-DD" always matches
        // the stored local-midnight timestamp in the user's timezone.
        dateInput: dateToInputValue(r.date),
        suggestedCategoryId: r.suggestedCategoryId,
        isDuplicate: r.isDuplicate,
      })),
    };
  }, [rawPreview, activeImportId]);

  /**
   * Full upload pipeline: validate → parse + normalize client-side →
   * best-effort storage upload → server preview creation. On success the
   * preview opens. Throws ImportError (stable code) for every known failure.
   */
  const uploadFile = React.useCallback(
    async (file: File) => {
      if (busy) return;
      setBusy("uploading");
      try {
        // 1. Type — CSV only (PDF/XLSX parsing is not implemented yet).
        const name = file.name.toLowerCase();
        const isCsv =
          file.type === "text/csv" ||
          file.type === "application/csv" ||
          name.endsWith(".csv");
        if (!isCsv) {
          throw new ImportError(
            "unsupportedType",
            "Only CSV files are supported.",
          );
        }

        // 2. Size — 5 MB cap (AGENTS.md §12).
        if (file.size > MAX_CSV_BYTES) {
          throw new ImportError("fileTooLarge", "File exceeds the 5 MB limit.");
        }

        // 3. Parse structure client-side (papaparse).
        let parsed;
        try {
          parsed = parseCSV(await file.text());
        } catch (err) {
          if (err instanceof CSVParseError) throw err;
          throw new ImportError("server", "Failed to read file.");
        }

        // 4. Row cap — 500 per batch (AGENTS.md §12).
        if (parsed.rows.length > MAX_IMPORT_ROWS) {
          throw new ImportError(
            "tooManyRows",
            `File has ${parsed.rows.length} rows — maximum is ${MAX_IMPORT_ROWS}.`,
          );
        }

        // 5. Normalize CLIENT-side so dates become local-midnight Unix ms —
        //    the same convention as manual entries (the normalizer's TIMEZONE
        //    CONTRACT). Convex runs in UTC and must never re-derive dates.
        const mapping = detectColumns(parsed.headers);
        if (!mappingIsValid(mapping)) {
          throw new ImportError(
            "missingColumns",
            `Could not detect required columns: ${missingColumnRoles(mapping).join(", ")}.`,
          );
        }
        const { rows: normalizedRows, skippedCount } = normalizeRows(
          parsed.rows,
          mapping,
        );
        if (normalizedRows.length === 0) {
          throw new ImportError(
            "noValidRows",
            "No valid transactions found — check that the date and amount columns are readable.",
          );
        }

        // 6. Best-effort raw file upload for the audit trail. Failure here
        //    never blocks the import itself.
        let storageId: string | undefined;
        try {
          const uploadUrl = await generateUploadUrl({});
          const res = await fetch(uploadUrl, { method: "POST", body: file });
          if (res.ok) {
            const body = (await res.json()) as { storageId?: string };
            storageId = body.storageId;
          }
        } catch (err) {
          console.warn("[import] storage upload skipped:", err);
        }

        // 7. Server validates the payload, suggests categories, and flags
        //    duplicates against the user's real transactions.
        const result = await createPreview({
          fileName: file.name,
          fileType: "csv",
          storageId,
          skippedCount,
          rows: normalizedRows.map(({ raw, normalized }) => ({
            type: normalized.type,
            amount: normalized.amount,
            description: normalized.description,
            date: normalized.date,
            raw,
          })),
        });

        setActiveImportId(result.importId as string);
      } catch (err) {
        console.warn("[import] upload failed:", err);
        throw new ImportError(
          toImportError(err),
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setBusy(null);
      }
    },
    [busy, generateUploadUrl, createPreview],
  );

  /** Confirm the batch with the user's final edits. Returns imported count. */
  const confirm = React.useCallback(
    async (edits: ImportRowEdits[]) => {
      if (!activeImportId || busy) {
        throw new ImportError("server", "No active import to confirm.");
      }
      setBusy("confirming");
      try {
        const result = await confirmMutation({
          importId: activeImportId,
          rows: edits.map((e) => ({
            rowId: e.rowId,
            type: e.type,
            amount: e.amount,
            description: e.description,
            date: e.dateMs,
            categoryId: e.categoryId,
            selected: e.selected,
          })),
        });
        setActiveImportId(null);
        return (result as { importedCount: number }).importedCount;
      } catch (err) {
        console.warn("[import] confirm failed:", err);
        throw new ImportError(
          toImportError(err),
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setBusy(null);
      }
    },
    [activeImportId, busy, confirmMutation],
  );

  /** Cancel and delete a preview import (active or from history). */
  const cancel = React.useCallback(
    async (importId?: string) => {
      const targetId = importId ?? activeImportId;
      if (!targetId || busy) return;
      setBusy("cancelling");
      try {
        await cancelMutation({ importId: targetId });
        if (targetId === activeImportId) setActiveImportId(null);
      } catch (err) {
        console.warn("[import] cancel failed:", err);
        throw new ImportError(
          toImportError(err),
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setBusy(null);
      }
    },
    [activeImportId, busy, cancelMutation],
  );

  /** Re-open a preview-status import from the history list. */
  const openPreview = React.useCallback(
    (importId: string) => {
      const record = imports.find((i) => i.id === importId);
      if (record && record.status === "preview") {
        setActiveImportId(importId);
      }
    },
    [imports],
  );

  return {
    imports,
    importsLoading: rawImports === undefined,
    preview,
    previewLoading: activeImportId !== null && rawPreview === undefined,
    activeImportId,
    openPreview,
    busy,
    uploadFile,
    confirm,
    cancel,
  };
}
