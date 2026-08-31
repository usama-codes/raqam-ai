import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./auth";
import type { Id } from "./_generated/dataModel";
import {
  MAX_IMPORT_ROWS,
  suggestCategory,
  detectDuplicates,
} from "@/lib/finance/import/normalizer";

// convex/imports.ts — Bank statement import pipeline (Phase 12)
//
// Flow: client parses + normalizes the CSV (papaparse + the normalizer, both
// client-only, so dates become local-midnight Unix ms like manual entries) →
// createPreview validates the payload and stores raw + normalized rows with
// rule-based category suggestions and duplicate flags (grounded in the user's
// real data, AGENTS.md P2) → user reviews/edits/deselects in the preview
// table → confirmImport persists everything in ONE mutation (Convex mutations
// are atomic: all rows commit or none do — AGENTS.md "no partial import").
//
// Dates are never re-derived here: Convex runs in UTC, so parsing dates
// server-side would break the local-midnight convention shared with manual
// entries (see the normalizer's TIMEZONE CONTRACT).

// ─── Arg types (mirror the validators for IDE type resolution) ──────────────────

type GenerateUploadUrlArgs = Record<string, never>;

/** One client-normalized row + its raw CSV cells (audit trail). */
type CreatePreviewRow = {
  type: "income" | "expense";
  amount: number;
  description: string;
  /** Unix ms — local midnight of the transaction date (client timezone). */
  date: number;
  raw: Record<string, string>;
};

type CreatePreviewArgs = {
  fileName: string;
  fileType: "csv" | "pdf" | "xlsx";
  storageId?: Id<"_storage">;
  /** Rows dropped during client-side normalization (bad date/amount). */
  skippedCount: number;
  rows: CreatePreviewRow[];
};

type GetPreviewArgs = { importId: Id<"imports"> };

type ConfirmRowArgs = {
  rowId: Id<"importedTransactions">;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: number;
  categoryId: Id<"categories">;
  selected: boolean;
};

type ConfirmImportArgs = {
  importId: Id<"imports">;
  rows: ConfirmRowArgs[];
};

type CancelImportArgs = { importId: Id<"imports"> };

// ─── Queries ────────────────────────────────────────────────────────────────────

/** List the user's import history, newest first. */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("imports")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20);
  },
});

/** Full preview payload: import metadata + normalized, editable rows. */
export const getPreview = query({
  args: { importId: v.id("imports") },
  handler: async (ctx: QueryCtx, args: GetPreviewArgs) => {
    const user = await requireUser(ctx);

    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== user._id) {
      throw new Error("Import not found or does not belong to this user.");
    }

    const rows = await ctx.db
      .query("importedTransactions")
      .withIndex("by_importId", (q) => q.eq("importId", args.importId))
      .collect();

    return {
      import: importDoc,
      rows: rows.map((r) => {
        const n = r.normalizedData;
        return {
          _id: r._id,
          type: n?.type ?? "expense",
          amount: n?.amount ?? 0,
          description: n?.description ?? "",
          // Unix ms — the client formats the calendar date in the USER's
          // timezone (see the normalizer's TIMEZONE CONTRACT).
          date: n?.date ?? 0,
          suggestedCategoryId: n?.suggestedCategoryId ?? null,
          isDuplicate: r.isDuplicate,
          isConfirmed: r.isConfirmed,
        };
      }),
    };
  },
});

// ─── Mutations ──────────────────────────────────────────────────────────────────

/** Generate a one-time upload URL for Convex file storage (auth-gated). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx, _args: GenerateUploadUrlArgs) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create an import preview from client-normalized rows.
 *
 * Validates the payload (bounds, 500-row cap), flags duplicates against
 * existing transactions AND within the batch, suggests a category per row
 * (rule-based), and persists everything with the import in "preview" status.
 * Throws (nothing persists) when a row is invalid or the batch is empty or
 * too large.
 */
export const createPreview = mutation({
  args: {
    fileName: v.string(),
    fileType: v.union(v.literal("csv"), v.literal("pdf"), v.literal("xlsx")),
    storageId: v.optional(v.id("_storage")),
    skippedCount: v.number(),
    rows: v.array(
      v.object({
        type: v.union(v.literal("income"), v.literal("expense")),
        amount: v.number(),
        description: v.string(),
        date: v.number(),
        raw: v.record(v.string(), v.string()),
      }),
    ),
  },
  handler: async (ctx: MutationCtx, args: CreatePreviewArgs) => {
    const user = await requireUser(ctx);

    if (args.fileType !== "csv") {
      throw new Error(
        "Only CSV files are supported — please export your statement as CSV.",
      );
    }

    const fileName = args.fileName.trim();
    if (!fileName) {
      throw new Error("File name cannot be empty.");
    }

    if (args.rows.length === 0) {
      throw new Error("No data rows found in CSV.");
    }
    if (args.rows.length > MAX_IMPORT_ROWS) {
      throw new Error(
        `Too many rows (${args.rows.length}) — maximum is ${MAX_IMPORT_ROWS} per import.`,
      );
    }

    // Rows arrive client-normalized (local-midnight dates). Re-check the
    // bounds the normalizer already enforces so a bad payload can never
    // persist (server-side validation is never delegated, AGENTS.md §4).
    for (const row of args.rows) {
      if (row.amount <= 0 || row.date <= 0 || row.date > 4102444800000) {
        throw new Error(
          "No valid transactions found — check that the date and amount columns are readable.",
        );
      }
    }

    // Resolve category suggestions to the user's real category IDs.
    const userCategories = await ctx.db
      .query("categories")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const categoryByName = new Map(userCategories.map((c) => [c.name, c._id]));
    const fallbackCategoryId =
      categoryByName.get("other") ??
      userCategories.find((c) => c.type !== "income")?._id ??
      null;

    // Existing transactions for duplicate detection (same date + amount +
    // description, AGENTS.md §12).
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();
    const existingCandidates = existing.map((t) => ({
      date: t.date,
      amount: t.amount,
      description: t.description ?? "",
    }));

    const duplicateFlags = detectDuplicates(
      args.rows.map((r) => ({
        date: r.date,
        amount: r.amount,
        description: r.description,
      })),
      existingCandidates,
    );

    const now = Date.now();
    const importId = await ctx.db.insert("imports", {
      userId: user._id,
      fileName,
      fileType: args.fileType,
      storageId: args.storageId,
      status: "preview",
      rowCount: args.rows.length,
      duplicateCount: duplicateFlags.filter(Boolean).length,
      skippedCount: args.skippedCount,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < args.rows.length; i++) {
      const row = args.rows[i];
      const suggestedSlug = suggestCategory(row.description);
      const suggestedCategoryId =
        (suggestedSlug !== undefined
          ? categoryByName.get(suggestedSlug)
          : undefined) ?? fallbackCategoryId;

      await ctx.db.insert("importedTransactions", {
        importId,
        userId: user._id,
        rawData: JSON.stringify(row.raw),
        normalizedData: {
          type: row.type,
          amount: row.amount,
          description: row.description.trim(),
          date: row.date,
          suggestedCategoryId: suggestedCategoryId ?? undefined,
        },
        isDuplicate: duplicateFlags[i],
        isConfirmed: false,
        createdAt: now,
      });
    }

    return {
      importId,
      rowCount: args.rows.length,
      duplicateCount: duplicateFlags.filter(Boolean).length,
      skippedCount: args.skippedCount,
    };
  },
});

/**
 * Confirm an import batch — the only path that writes imported rows into
 * `transactions`. Runs in a single atomic mutation: every selected row is
 * inserted, every preview row is linked, and the import is marked confirmed,
 * or none of it happens (AGENTS.md: no partial import).
 */
export const confirmImport = mutation({
  args: {
    importId: v.id("imports"),
    rows: v.array(
      v.object({
        rowId: v.id("importedTransactions"),
        type: v.union(v.literal("income"), v.literal("expense")),
        amount: v.number(),
        description: v.string(),
        date: v.number(),
        categoryId: v.id("categories"),
        selected: v.boolean(),
      }),
    ),
  },
  handler: async (ctx: MutationCtx, args: ConfirmImportArgs) => {
    const user = await requireUser(ctx);

    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== user._id) {
      throw new Error("Import not found or does not belong to this user.");
    }
    if (importDoc.status !== "preview") {
      throw new Error("This import has already been processed.");
    }

    // Every submitted row must belong to this import.
    const previewRows = await ctx.db
      .query("importedTransactions")
      .withIndex("by_importId", (q) => q.eq("importId", args.importId))
      .collect();
    const rowById = new Map(previewRows.map((r) => [r._id, r]));

    for (const row of args.rows) {
      if (!rowById.has(row.rowId)) {
        throw new Error("Import row not found in this import.");
      }
    }

    // Validate categories once per distinct ID.
    const categoryIds = [...new Set(args.rows.map((r) => r.categoryId))];
    for (const categoryId of categoryIds) {
      const category = await ctx.db.get(categoryId);
      if (!category || category.userId !== user._id) {
        throw new Error("Category not found or does not belong to this user.");
      }
    }

    const now = Date.now();
    let importedCount = 0;

    for (const row of args.rows) {
      if (row.amount <= 0) {
        throw new Error("Transaction amount must be greater than zero.");
      }
      // Sanity range: 1970–2099 (mirrors the normalizer's date parser).
      if (row.date <= 0 || row.date > 4102444800000) {
        throw new Error("Transaction date is invalid.");
      }

      const description = row.description.trim();
      let transactionId: Id<"transactions"> | undefined;

      if (row.selected) {
        transactionId = await ctx.db.insert("transactions", {
          userId: user._id,
          type: row.type,
          amount: row.amount,
          categoryId: row.categoryId,
          description: description || undefined,
          date: row.date,
          source: "import",
          importId: args.importId,
          isRecurring: false,
          pendingConfirmation: false,
          createdAt: now,
          updatedAt: now,
        });
        importedCount++;
      }

      // Persist the user's final edits back onto the preview row (audit trail).
      await ctx.db.patch(row.rowId, {
        normalizedData: {
          type: row.type,
          amount: row.amount,
          description,
          date: row.date,
          suggestedCategoryId: row.categoryId,
        },
        isConfirmed: row.selected,
        ...(transactionId !== undefined ? { transactionId } : {}),
      });
    }

    await ctx.db.patch(args.importId, {
      status: "confirmed",
      importedCount,
      updatedAt: now,
    });

    return { importedCount };
  },
});

/**
 * Cancel a preview import: deletes the preview rows, the raw stored file,
 * and the import record. Confirmed imports are immutable history.
 */
export const cancelImport = mutation({
  args: { importId: v.id("imports") },
  handler: async (ctx: MutationCtx, args: CancelImportArgs) => {
    const user = await requireUser(ctx);

    const importDoc = await ctx.db.get(args.importId);
    if (!importDoc || importDoc.userId !== user._id) {
      throw new Error("Import not found or does not belong to this user.");
    }
    if (importDoc.status !== "preview") {
      throw new Error("Only pending previews can be cancelled.");
    }

    const previewRows = await ctx.db
      .query("importedTransactions")
      .withIndex("by_importId", (q) => q.eq("importId", args.importId))
      .collect();
    for (const row of previewRows) {
      await ctx.db.delete(row._id);
    }

    if (importDoc.storageId) {
      await ctx.storage.delete(importDoc.storageId);
    }

    await ctx.db.delete(args.importId);
  },
});
