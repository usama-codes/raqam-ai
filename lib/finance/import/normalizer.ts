// lib/finance/import/normalizer.ts — Import normalization (Phase 12)
//
// Pure functions that map bank-statement CSV rows onto the internal
// transaction format. No DOM, no Convex imports — shared by the client hook
// (which parses + normalizes rows before sending them to Convex) and by
// convex/imports.ts (which runs category suggestion + duplicate detection
// server-side).
//
// TIMEZONE CONTRACT: parseDateValue / inputValueToDate construct Dates via the
// LOCAL timezone (new Date(y, m, d)) so imported transactions carry the same
// "midnight of the transaction date" timestamps as manually created ones.
// They must therefore only be called CLIENT-SIDE. The Convex action receives
// ready Unix-ms values.

// ─── Constants ──────────────────────────────────────────────────────────────────

/** AGENTS.md §9 Phase 12: maximum import batch size. */
export const MAX_IMPORT_ROWS = 500;

export interface NormalizedTransaction {
  type: "income" | "expense";
  /** Always positive PKR. */
  amount: number;
  description: string;
  /** Unix ms — local midnight of the transaction date. */
  date: number;
}

/** Which CSV header plays which role. */
export interface ColumnMapping {
  date?: string;
  description?: string;
  /** Single (possibly signed) amount column. */
  amount?: string;
  /** Separate debit column (expense) — Pakistani bank layout. */
  debit?: string;
  /** Separate credit column (income) — Pakistani bank layout. */
  credit?: string;
  /** DR/CR indicator column. */
  type?: string;
}

// ─── Header detection ───────────────────────────────────────────────────────────

const DATE_HEADERS = [
  "date",
  "transaction date",
  "value date",
  "posting date",
  "txn date",
  "trxn date",
  "تاریخ",
];

const DESCRIPTION_HEADERS = [
  "description",
  "narration",
  "particulars",
  "details",
  "remarks",
  "transaction details",
  "تفصیل",
];

const DEBIT_HEADERS = [
  "debit",
  "withdrawal",
  "withdrawal amount",
  "debit amount",
  "dr",
];
const CREDIT_HEADERS = [
  "credit",
  "deposit",
  "deposit amount",
  "credit amount",
  "cr",
];
const TYPE_HEADERS = ["type", "transaction type", "dr/cr", "d/c", "txn type"];
const AMOUNT_HEADERS = ["amount", "transaction amount", "value", "amount pkr"];

/** Lowercase, collapsed whitespace, punctuation-neutralized header key. */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[_.]+/g, " ")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Auto-detect which columns hold date, description, and amount(s).
 * Column ORDER in the file is irrelevant — detection is header-name based.
 * Exact matches win; a fuzzy (contains) pass fills the gaps, with
 * debit/credit checked before a generic amount column ("Debit Amount"
 * must not be mistaken for the plain amount column).
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  const normalized = headers.map((h) => ({ raw: h, key: normalizeHeader(h) }));

  const exact = (candidates: string[]): string | undefined => {
    for (const cand of candidates) {
      const hit = normalized.find((h) => !used.has(h.raw) && h.key === cand);
      if (hit) {
        used.add(hit.raw);
        return hit.raw;
      }
    }
    return undefined;
  };

  const fuzzy = (candidates: string[]): string | undefined => {
    for (const cand of candidates) {
      const hit = normalized.find(
        (h) => !used.has(h.raw) && h.key.includes(cand),
      );
      if (hit) {
        used.add(hit.raw);
        return hit.raw;
      }
    }
    return undefined;
  };

  mapping.date = exact(DATE_HEADERS);
  mapping.description = exact(DESCRIPTION_HEADERS);
  mapping.debit = exact(DEBIT_HEADERS);
  mapping.credit = exact(CREDIT_HEADERS);
  mapping.type = exact(TYPE_HEADERS);
  mapping.amount = exact(AMOUNT_HEADERS);

  // Fuzzy pass — debit/credit first so "Debit Amount" never becomes "amount".
  mapping.debit = mapping.debit ?? fuzzy(DEBIT_HEADERS);
  mapping.credit = mapping.credit ?? fuzzy(CREDIT_HEADERS);
  mapping.type = mapping.type ?? fuzzy(TYPE_HEADERS);
  mapping.description = mapping.description ?? fuzzy(DESCRIPTION_HEADERS);
  mapping.date = mapping.date ?? fuzzy(DATE_HEADERS);
  mapping.amount = mapping.amount ?? fuzzy(AMOUNT_HEADERS);

  return mapping;
}

/** A mapping can normalize rows only if date + description + some amount exist. */
export function mappingIsValid(mapping: ColumnMapping): boolean {
  return (
    mapping.date !== undefined &&
    mapping.description !== undefined &&
    (mapping.amount !== undefined ||
      mapping.debit !== undefined ||
      mapping.credit !== undefined)
  );
}

/** Human-readable list of missing roles, e.g. ["date", "amount"]. */
export function missingColumnRoles(mapping: ColumnMapping): string[] {
  const missing: string[] = [];
  if (mapping.date === undefined) missing.push("date");
  if (mapping.description === undefined) missing.push("description");
  if (
    mapping.amount === undefined &&
    mapping.debit === undefined &&
    mapping.credit === undefined
  ) {
    missing.push("amount");
  }
  return missing;
}

// ─── Value parsing ──────────────────────────────────────────────────────────────

/**
 * Parse an amount cell: "1,234.56", "Rs. 500", "PKR 1200", "(250)" → -250,
 * "500-" → -500. Returns the signed number or null when unparseable.
 */
export function parseAmountValue(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1);
  }

  s = s
    .replace(/rs\.?|pkr|₨/g, "")
    .replace(/[,\s]/g, "")
    .trim();

  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  if (s.startsWith("+")) {
    s = s.slice(1);
  }

  if (!/^\d+(\.\d+)?$/.test(s)) return null;

  const value = parseFloat(s);
  if (!isFinite(value)) return null;
  return negative ? -value : value;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function buildLocalDate(
  year: number,
  month: number,
  day: number,
): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Expand 2-digit years BEFORE the range check ("26" means 2026, not 26 AD).
  if (year < 100) year = 2000 + year;
  if (year < 1970 || year > 2099) return null;

  const d = new Date(year, month - 1, day);
  // Reject rollovers like 31/02 → 03 Mar.
  if (d.getDate() !== day || d.getMonth() !== month - 1) return null;
  return d.getTime();
}

/**
 * Parse a date cell into local-midnight Unix ms. Supported formats
 * (Pakistani statements first):
 *   2026-08-31 · 2026/08/31 · 31/08/2026 · 31-08-26 · 08/31/2026 (US fallback
 *   when the second part > 12) · 31-Aug-2026 · 31 Aug 2026 · Aug 31, 2026
 * Ambiguous d/m vs m/d resolves as day-first (Pakistan convention).
 */
export function parseDateValue(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO: 2026-08-31 / 2026/08/31 (optionally with a trailing time part).
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return buildLocalDate(+m[1], +m[2], +m[3]);
  }

  // Numeric d/m/y (or m/d/y when only that reading is valid).
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    if (a > 12 && b <= 12) return buildLocalDate(year, b, a); // DD/MM
    if (b > 12 && a <= 12) return buildLocalDate(year, a, b); // MM/DD
    // Both ≤ 12 — ambiguous: day-first (Pakistan).
    return buildLocalDate(year, b, a);
  }

  // 31-Aug-2026 / 31 Aug 2026
  m = s.match(/^(\d{1,2})[\s-]+([a-z]{3,9})[\s-]+(\d{2,4})$/i);
  if (m) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (month) return buildLocalDate(+m[3], month, +m[1]);
  }

  // Aug 31, 2026 / Aug 31 2026
  m = s.match(/^([a-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (m) {
    const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (month) return buildLocalDate(+m[3], month, +m[2]);
  }

  // Last resort: let the platform parse it (reject pre-1970 junk).
  const t = new Date(s).getTime();
  if (!isNaN(t) && t >= 0) return t;
  return null;
}

/** Unix ms → "YYYY-MM-DD" for <input type="date"> (local calendar date). */
export function dateToInputValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" (date input) → local-midnight Unix ms, or null when invalid. */
export function inputValueToDate(value: string): number | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return buildLocalDate(+m[1], +m[2], +m[3]);
}

// ─── Row normalization ──────────────────────────────────────────────────────────

function parseTypeToken(token: string): "income" | "expense" | null {
  const t = token.trim().toLowerCase();
  if (
    ["cr", "c", "credit", "deposit", "in", "income", "received"].includes(t)
  ) {
    return "income";
  }
  if (
    [
      "dr",
      "d",
      "debit",
      "withdrawal",
      "out",
      "expense",
      "paid",
      "sent",
    ].includes(t)
  ) {
    return "expense";
  }
  return null;
}

export interface NormalizeResult {
  rows: { raw: Record<string, string>; normalized: NormalizedTransaction }[];
  /** Rows dropped because date/amount could not be parsed. */
  skippedCount: number;
}

/**
 * Normalize raw CSV rows using a detected column mapping.
 *
 * Type inference order:
 *   1. Separate debit/credit columns (Pakistani bank layout).
 *   2. DR/CR type column.
 *   3. Single amount column:
 *      - any negative present → signed statement (positive = income).
 *      - all positive → conservative default "expense" (editable in preview).
 *
 * Column order in the file never matters; rows with unparseable dates or
 * amounts are skipped and counted, never fabricated (AGENTS.md P2).
 */
export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): NormalizeResult {
  const result: NormalizeResult["rows"] = [];
  let skippedCount = 0;

  // First pass — parse values.
  const parsed = rows.map((row) => {
    const date =
      mapping.date !== undefined
        ? parseDateValue(row[mapping.date] ?? "")
        : null;

    let type: "income" | "expense" | null = null;
    let amount: number | null = null;

    if (mapping.debit !== undefined || mapping.credit !== undefined) {
      const debit =
        mapping.debit !== undefined
          ? parseAmountValue(row[mapping.debit] ?? "")
          : null;
      const credit =
        mapping.credit !== undefined
          ? parseAmountValue(row[mapping.credit] ?? "")
          : null;
      if (credit !== null && credit > 0) {
        type = "income";
        amount = credit;
      } else if (debit !== null && debit > 0) {
        type = "expense";
        amount = debit;
      }
    }

    if (type === null && amount === null && mapping.amount !== undefined) {
      amount = parseAmountValue(row[mapping.amount] ?? "");
    }

    if (type === null && mapping.type !== undefined) {
      type = parseTypeToken(row[mapping.type] ?? "");
    }

    const description =
      mapping.description !== undefined
        ? (row[mapping.description] ?? "").trim()
        : "";

    return { row, date, amount, type, description };
  });

  // Batch sign heuristic for single-column amounts without type info.
  const needsHeuristic = parsed.some(
    (p) => p.type === null && p.amount !== null,
  );
  const hasNegative = parsed.some((p) => (p.amount ?? 0) < 0);

  for (const p of parsed) {
    if (p.date === null || p.amount === null || Math.abs(p.amount) <= 0) {
      skippedCount++;
      continue;
    }

    let type = p.type;
    if (type === null) {
      // Single signed amount column.
      type =
        needsHeuristic && hasNegative
          ? p.amount > 0
            ? "income"
            : "expense"
          : "expense";
    }

    result.push({
      raw: p.row,
      normalized: {
        type,
        amount: Math.abs(p.amount),
        description: p.description,
        date: p.date,
      },
    });
  }

  return { rows: result, skippedCount };
}

// ─── Category suggestion (rule-based) ───────────────────────────────────────────

/**
 * Keyword → system category name, most specific first. Returns the category
 * slug (e.g. "transportation") or undefined for no match.
 */
const CATEGORY_KEYWORDS: [string, string[]][] = [
  [
    "phone",
    [
      "jazzcash",
      "easypaisa load",
      "mobile load",
      "jazz",
      "zong",
      "ufone",
      "telenor",
      "ptcl",
      "internet package",
      "mobile bill",
    ],
  ],
  [
    "utilities",
    [
      "k-electric",
      "kelectric",
      "kesc",
      "lesco",
      "electricity",
      "electric",
      "ssgc",
      "sui gas",
      "gas bill",
      "water bill",
      "wasa",
      "bill",
    ],
  ],
  [
    "transportation",
    [
      "uber",
      "careem",
      "bykea",
      "indrive",
      "in drive",
      "rickshaw",
      "taxi",
      "petrol",
      "fuel",
      "petrol pump",
      "shell",
      "bus",
      "daewoo",
      "hiace",
    ],
  ],
  [
    "food",
    [
      "foodpanda",
      "food panda",
      "kfc",
      "mcdonald",
      "pizza",
      "burger",
      "biryani",
      "karahi",
      "kabab",
      "chai",
      "bakery",
      "restaurant",
      "cafe",
      "grocery",
      "imtiaz",
      "sabzi",
    ],
  ],
  ["rent", ["rent", "kiraya"]],
  [
    "health",
    [
      "hospital",
      "clinic",
      "pharmacy",
      "medicine",
      "dawa",
      "doctor",
      "dispensary",
      "lab test",
    ],
  ],
  [
    "education",
    [
      "school",
      "college",
      "university",
      "tuition",
      "fee",
      "books",
      "stationary",
    ],
  ],
  [
    "shopping",
    [
      "daraz",
      "metro",
      "al fatah",
      "chase up",
      "chaseup",
      "store",
      "market",
      "shoes",
      "clothes",
      "garment",
      "boutique",
    ],
  ],
  [
    "entertainment",
    [
      "netflix",
      "spotify",
      "shahid",
      "cinema",
      "cinepax",
      "game",
      "steam",
      "playstation",
      "xbox",
    ],
  ],
  ["salary", ["salary", "payroll"]],
  [
    "freelance",
    ["freelance", "fiverr", "upwork", "client payment", "retainer"],
  ],
  ["savings", ["saving", "savings", "bachat"]],
  ["gifts", ["gift", "eidi"]],
];

/** Rule-based category suggestion from the transaction description. */
export function suggestCategory(description: string): string | undefined {
  const desc = description.toLowerCase();
  if (!desc) return undefined;
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) return category;
    }
  }
  return undefined;
}

// ─── Duplicate detection ────────────────────────────────────────────────────────

export interface DuplicateCandidate {
  date: number;
  amount: number;
  description: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar-day key (UTC components). Stable across fixed-offset timezones. */
function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function normalizeDescriptionText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Duplicate = same calendar day + same amount + same normalized description
 * (AGENTS.md: date, amount, description).
 */
export function duplicateKey(candidate: DuplicateCandidate): string {
  return `${dayKey(candidate.date)}|${candidate.amount.toFixed(2)}|${normalizeDescriptionText(candidate.description)}`;
}

/**
 * Flag duplicates per row — against the user's existing transactions AND
 * against earlier rows in the same batch (first occurrence stays unflagged).
 */
export function detectDuplicates(
  rows: DuplicateCandidate[],
  existing: readonly DuplicateCandidate[],
): boolean[] {
  const existingKeys = new Set(existing.map(duplicateKey));
  const seenInBatch = new Set<string>();

  return rows.map((row) => {
    const key = duplicateKey(row);
    if (existingKeys.has(key)) return true;
    if (seenInBatch.has(key)) return true;
    seenInBatch.add(key);
    return false;
  });
}
