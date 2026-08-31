// lib/finance/import/csv.ts — CSV import parsing (Phase 12)
//
// Thin wrapper around papaparse that turns bank-statement CSV text into
// header-keyed row records. Runs CLIENT-SIDE only (the hook calls it before
// sending rows to Convex) — convex/ imports only the pure normalizer, so
// papaparse never enters the Convex bundle.

import Papa from "papaparse";

export interface ParsedCSV {
  /** Trimmed, non-empty header names in file order. */
  headers: string[];
  /** Rows keyed by header name. Missing cells are empty strings. */
  rows: Record<string, string>[];
}

/** Structural CSV failure with a machine-readable code for i18n mapping. */
export class CSVParseError extends Error {
  readonly code: "empty" | "encoding" | "no-headers" | "no-rows" | "malformed";

  constructor(code: CSVParseError["code"], message: string) {
    super(message);
    this.name = "CSVParseError";
    this.code = code;
  }
}

/**
 * Parse CSV text into headers + row records.
 * Handles quoted fields, escaped commas, CRLF/LF line endings, and a UTF-8 BOM.
 * Throws CSVParseError (with a stable code) on structural failures.
 */
export function parseCSV(csvContent: string): ParsedCSV {
  // Strip a UTF-8 BOM if present.
  const content =
    csvContent.charCodeAt(0) === 0xfeff ? csvContent.slice(1) : csvContent;

  // NUL bytes mean we decoded a binary/UTF-16 file as text — not a usable CSV.
  if (content.includes("\u0000")) {
    throw new CSVParseError("encoding", "File is not valid UTF-8 CSV text.");
  }

  if (!content.trim()) {
    throw new CSVParseError("empty", "File is empty.");
  }

  // A first line made only of delimiters/quotes means no usable header row —
  // papaparse auto-renames the empty columns instead of failing, so check it
  // ourselves before parsing.
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  if (!/[^\s,;"']/.test(firstLine)) {
    throw new CSVParseError("no-headers", "No header row found in CSV.");
  }

  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  // Fatal structural problems (e.g. unclosed quotes abort the parse).
  if (result.meta.aborted) {
    throw new CSVParseError(
      "malformed",
      "CSV parsing aborted — malformed file.",
    );
  }

  const headers = (result.meta.fields ?? []).filter((h) => h && h.length > 0);
  if (headers.length === 0) {
    throw new CSVParseError("no-headers", "No header row found in CSV.");
  }

  // Field mismatches (short/long rows) are tolerated — papaparse pads/blanks.
  // Everything else (delimiters, quotes mid-file) counts as malformed.
  const fatal = result.errors.filter((e) => e.type !== "FieldMismatch");
  if (fatal.length > 0) {
    throw new CSVParseError(
      "malformed",
      `CSV parsing failed: ${fatal[0].message}`,
    );
  }

  // Normalize every cell to a trimmed string so downstream code (and the
  // Convex v.record(v.string(), v.string()) arg) never sees undefined.
  const rows = result.data
    .filter((row) => row != null && typeof row === "object")
    .map((row) => {
      const clean: Record<string, string> = {};
      for (const key of headers) {
        const value = row[key];
        clean[key] = typeof value === "string" ? value.trim() : "";
      }
      return clean;
    })
    .filter((row) => Object.values(row).some((v) => v !== ""));

  if (rows.length === 0) {
    throw new CSVParseError("no-rows", "No data rows found in CSV.");
  }

  return { headers, rows };
}
