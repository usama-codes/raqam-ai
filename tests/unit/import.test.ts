import { describe, it, expect } from "vitest";
import { parseCSV, CSVParseError } from "@/lib/finance/import/csv";
import {
  MAX_IMPORT_ROWS,
  detectColumns,
  mappingIsValid,
  missingColumnRoles,
  parseAmountValue,
  parseDateValue,
  dateToInputValue,
  inputValueToDate,
  normalizeRows,
  suggestCategory,
  duplicateKey,
  detectDuplicates,
} from "@/lib/finance/import/normalizer";

// Import pipeline (AGENTS.md §13, Phase 12): CSV parsing, column
// auto-detection, value normalization, category suggestion, and duplicate
// detection — all deterministic and offline. Dates are compared against
// local-midnight constructions so the suite is timezone-independent (the
// same convention manual entries use — see the normalizer's contract).

/** Assert that parseCSV throws CSVParseError and return its code. */
function csvErrorCode(fn: () => unknown): CSVParseError["code"] {
  try {
    fn();
  } catch (err) {
    if (err instanceof CSVParseError) return err.code;
    throw err;
  }
  throw new Error("expected parseCSV to throw a CSVParseError");
}

// Local-midnight timestamps, built exactly like the production parser.
const aug1 = new Date(2026, 7, 1).getTime();
const aug2 = new Date(2026, 7, 2).getTime();
const aug5 = new Date(2026, 7, 5).getTime();
const aug30 = new Date(2026, 7, 30).getTime();
const aug31 = new Date(2026, 7, 31).getTime();

// ─── parseCSV ──────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("parses a standard date/description/amount CSV with quoted commas and CRLF", () => {
    const parsed = parseCSV(
      'Date,Description,Amount\r\n2026-08-31,"Foodpanda, lunch",1250\r\n2026-08-30,K-Electric,6400',
    );
    expect(parsed.headers).toEqual(["Date", "Description", "Amount"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toEqual({
      Date: "2026-08-31",
      Description: "Foodpanda, lunch",
      Amount: "1250",
    });
    expect(parsed.rows[1].Amount).toBe("6400");
  });

  it("keeps file column order — reversed files parse fine (order never matters)", () => {
    const parsed = parseCSV(
      "Amount,Description,Date\n1250,Foodpanda,2026-08-31",
    );
    expect(parsed.headers).toEqual(["Amount", "Description", "Date"]);
    expect(parsed.rows[0].Date).toBe("2026-08-31");
    expect(parsed.rows[0].Amount).toBe("1250");
  });

  it("strips a UTF-8 BOM from the header row", () => {
    const parsed = parseCSV(
      "\uFEFFDate,Description,Amount\n2026-08-31,Food,500",
    );
    expect(parsed.headers[0]).toBe("Date");
    expect(parsed.rows[0].Date).toBe("2026-08-31");
  });

  it("tolerates field mismatches (short/long rows) instead of failing", () => {
    const parsed = parseCSV(
      "Date,Description,Amount\n2026-08-31,Food,500,EXTRA\n2026-08-30,Short",
    );
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].Amount).toBe("500");
    expect(parsed.rows[1].Amount).toBe("");
  });

  it("rejects an empty file with code 'empty'", () => {
    expect(csvErrorCode(() => parseCSV(""))).toBe("empty");
    expect(csvErrorCode(() => parseCSV("   \n  \n"))).toBe("empty");
  });

  it("rejects binary content with code 'encoding'", () => {
    expect(csvErrorCode(() => parseCSV("Da\u0000te,Amount\n1,2"))).toBe(
      "encoding",
    );
  });

  it("rejects a header-only file with code 'no-rows'", () => {
    expect(csvErrorCode(() => parseCSV("Date,Description,Amount\n"))).toBe(
      "no-rows",
    );
  });

  it("rejects a file without usable headers with code 'no-headers'", () => {
    expect(csvErrorCode(() => parseCSV(",,\n1,2,3"))).toBe("no-headers");
  });

  it("rejects malformed CSV (unclosed quote) with code 'malformed'", () => {
    expect(
      csvErrorCode(() =>
        parseCSV('Date,Description,Amount\n2026-08-31,"Unclosed,500'),
      ),
    ).toBe("malformed");
  });
});

// ─── detectColumns ─────────────────────────────────────────────────────────

describe("detectColumns", () => {
  it("detects standard date/description/amount columns", () => {
    expect(detectColumns(["Date", "Description", "Amount"])).toEqual({
      date: "Date",
      description: "Description",
      amount: "Amount",
    });
  });

  it("auto-detects columns regardless of file order", () => {
    const mapping = detectColumns(["Amount", "Description", "Date"]);
    expect(mapping.date).toBe("Date");
    expect(mapping.description).toBe("Description");
    expect(mapping.amount).toBe("Amount");
  });

  it("matches case- and punctuation-insensitively (TXN_DATE, Transaction Amount)", () => {
    const mapping = detectColumns([
      "TXN_DATE",
      "Transaction Amount",
      "Particulars",
    ]);
    expect(mapping.date).toBe("TXN_DATE");
    expect(mapping.amount).toBe("Transaction Amount");
    expect(mapping.description).toBe("Particulars");
  });

  it("detects the Pakistani debit/credit layout", () => {
    const mapping = detectColumns(["Date", "Narration", "Debit", "Credit"]);
    expect(mapping.date).toBe("Date");
    expect(mapping.description).toBe("Narration");
    expect(mapping.debit).toBe("Debit");
    expect(mapping.credit).toBe("Credit");
    expect(mapping.amount).toBeUndefined();
    expect(mappingIsValid(mapping)).toBe(true);
  });

  it("never mistakes 'Debit Amount'/'Credit Amount' for the amount column", () => {
    const mapping = detectColumns([
      "Date",
      "Description",
      "Debit Amount",
      "Credit Amount",
    ]);
    expect(mapping.debit).toBe("Debit Amount");
    expect(mapping.credit).toBe("Credit Amount");
    expect(mapping.amount).toBeUndefined();
  });

  it("detects Urdu date/description headers", () => {
    const mapping = detectColumns(["تاریخ", "تفصیل", "Amount"]);
    expect(mapping.date).toBe("تاریخ");
    expect(mapping.description).toBe("تفصیل");
    expect(mapping.amount).toBe("Amount");
  });

  it("reports missing roles for an unrecognized header set", () => {
    const mapping = detectColumns(["Foo", "Bar"]);
    expect(mappingIsValid(mapping)).toBe(false);
    expect(missingColumnRoles(mapping)).toEqual([
      "date",
      "description",
      "amount",
    ]);
  });
});

// ─── parseAmountValue ──────────────────────────────────────────────────────

describe("parseAmountValue", () => {
  it("parses plain and comma-separated numbers", () => {
    expect(parseAmountValue("1250")).toBe(1250);
    expect(parseAmountValue("1,234.56")).toBe(1234.56);
  });

  it("strips PKR currency markers", () => {
    expect(parseAmountValue("Rs. 500")).toBe(500);
    expect(parseAmountValue("PKR 1200")).toBe(1200);
    expect(parseAmountValue("₨ 1,000")).toBe(1000);
  });

  it("recognizes accounting negatives", () => {
    expect(parseAmountValue("(250)")).toBe(-250);
    expect(parseAmountValue("500-")).toBe(-500);
    expect(parseAmountValue("-75.25")).toBe(-75.25);
    expect(parseAmountValue("+300")).toBe(300);
  });

  it("returns null for unparseable values", () => {
    expect(parseAmountValue("")).toBeNull();
    expect(parseAmountValue("   ")).toBeNull();
    expect(parseAmountValue("N/A")).toBeNull();
    expect(parseAmountValue("12.5.6")).toBeNull();
  });
});

// ─── parseDateValue ────────────────────────────────────────────────────────

describe("parseDateValue", () => {
  it("parses ISO dates as local midnight, dropping any time part", () => {
    expect(parseDateValue("2026-08-31")).toBe(aug31);
    expect(parseDateValue("2026/08/31")).toBe(aug31);
    expect(parseDateValue("2026-08-31 14:30")).toBe(aug31);
  });

  it("parses day-first numeric dates (Pakistan convention)", () => {
    expect(parseDateValue("31/08/2026")).toBe(aug31);
    expect(parseDateValue("31-08-2026")).toBe(aug31);
    expect(parseDateValue("31-08-26")).toBe(aug31); // 2-digit year → 2026
    expect(parseDateValue("05/08/2026")).toBe(aug5); // ambiguous → day-first
  });

  it("falls back to month-first only when the day-first reading is impossible", () => {
    expect(parseDateValue("08/31/2026")).toBe(aug31); // 31 cannot be a month
  });

  it("parses textual month formats", () => {
    expect(parseDateValue("31-Aug-2026")).toBe(aug31);
    expect(parseDateValue("31 Aug 2026")).toBe(aug31);
    expect(parseDateValue("Aug 31, 2026")).toBe(aug31);
  });

  it("rejects invalid and rollover dates", () => {
    expect(parseDateValue("31/02/2026")).toBeNull(); // Feb 31 rolls over
    expect(parseDateValue("31/13/2026")).toBeNull(); // 13 cannot be a month
    expect(parseDateValue("not a date")).toBeNull();
    expect(parseDateValue("")).toBeNull();
  });
});

// ─── date input helpers ────────────────────────────────────────────────────

describe("date input helpers", () => {
  it("round-trips Unix ms ↔ YYYY-MM-DD", () => {
    expect(dateToInputValue(aug31)).toBe("2026-08-31");
    expect(inputValueToDate("2026-08-31")).toBe(aug31);
  });

  it("rejects invalid input values", () => {
    expect(inputValueToDate("2026-02-31")).toBeNull();
    expect(inputValueToDate("31/08/2026")).toBeNull();
  });
});

// ─── normalizeRows ─────────────────────────────────────────────────────────

describe("normalizeRows", () => {
  it("normalizes a standard CSV with mixed signed amounts (positive = income)", () => {
    const mapping = detectColumns(["Date", "Description", "Amount"]);
    const { rows, skippedCount } = normalizeRows(
      [
        { Date: "01/08/2026", Description: "Salary", Amount: "80,000" },
        {
          Date: "02/08/2026",
          Description: "K-Electric bill",
          Amount: "-6,500",
        },
      ],
      mapping,
    );
    expect(skippedCount).toBe(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].normalized).toEqual({
      type: "income",
      amount: 80000,
      description: "Salary",
      date: aug1,
    });
    expect(rows[1].normalized).toEqual({
      type: "expense",
      amount: 6500,
      description: "K-Electric bill",
      date: aug2,
    });
    // The raw row is preserved for the audit trail.
    expect(rows[0].raw).toEqual({
      Date: "01/08/2026",
      Description: "Salary",
      Amount: "80,000",
    });
  });

  it("defaults all-positive single-column statements to expense (editable in preview)", () => {
    const mapping = detectColumns(["Date", "Description", "Amount"]);
    const { rows } = normalizeRows(
      [{ Date: "01/08/2026", Description: "Grocery", Amount: "2500" }],
      mapping,
    );
    expect(rows[0].normalized.type).toBe("expense");
    expect(rows[0].normalized.amount).toBe(2500);
  });

  it("uses the credit column as income and the debit column as expense", () => {
    const mapping = detectColumns(["Date", "Narration", "Debit", "Credit"]);
    const { rows } = normalizeRows(
      [
        {
          Date: "31/08/2026",
          Narration: "Salary credit",
          Debit: "",
          Credit: "Rs. 50,000",
        },
        {
          Date: "31/08/2026",
          Narration: "K-Electric",
          Debit: "6400",
          Credit: "",
        },
      ],
      mapping,
    );
    expect(rows[0].normalized.type).toBe("income");
    expect(rows[0].normalized.amount).toBe(50000);
    expect(rows[1].normalized.type).toBe("expense");
    expect(rows[1].normalized.amount).toBe(6400);
  });

  it("uses a DR/CR indicator column when present", () => {
    const mapping = detectColumns(["Date", "Details", "Amount", "DR/CR"]);
    const { rows } = normalizeRows(
      [
        {
          Date: "31/08/2026",
          Details: "Refund",
          Amount: "1200",
          "DR/CR": "CR",
        },
        {
          Date: "31/08/2026",
          Details: "Careem ride",
          Amount: "450",
          "DR/CR": "DR",
        },
      ],
      mapping,
    );
    expect(rows[0].normalized.type).toBe("income");
    expect(rows[1].normalized.type).toBe("expense");
  });

  it("skips rows with unparseable dates or amounts and counts them", () => {
    const mapping = detectColumns(["Date", "Description", "Amount"]);
    const { rows, skippedCount } = normalizeRows(
      [
        { Date: "garbage", Description: "Bad date", Amount: "100" },
        { Date: "01/08/2026", Description: "Bad amount", Amount: "N/A" },
        { Date: "01/08/2026", Description: "Zero amount", Amount: "0" },
        { Date: "01/08/2026", Description: "Good", Amount: "100" },
      ],
      mapping,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].normalized.description).toBe("Good");
    expect(skippedCount).toBe(3);
  });

  it("is column-order agnostic — reversed files normalize identically", () => {
    const forward = normalizeRows(
      [{ Date: "31/08/2026", Description: "Foodpanda", Amount: "1250" }],
      detectColumns(["Date", "Description", "Amount"]),
    );
    const reversed = normalizeRows(
      [{ Amount: "1250", Description: "Foodpanda", Date: "31/08/2026" }],
      detectColumns(["Amount", "Description", "Date"]),
    );
    expect(reversed.rows[0].normalized).toEqual(forward.rows[0].normalized);
  });
});

// ─── suggestCategory ───────────────────────────────────────────────────────

describe("suggestCategory", () => {
  it("maps known Pakistani merchants to system categories", () => {
    expect(suggestCategory("FOODPANDA ORDER #123")).toBe("food");
    expect(suggestCategory("K-Electric bill August")).toBe("utilities");
    expect(suggestCategory("Careem ride to office")).toBe("transportation");
    expect(suggestCategory("Monthly house rent")).toBe("rent");
    expect(suggestCategory("Salary — ABC Corp")).toBe("salary");
  });

  it("returns undefined for unknown descriptions", () => {
    expect(suggestCategory("random transfer xyz")).toBeUndefined();
    expect(suggestCategory("")).toBeUndefined();
  });
});

// ─── duplicate detection ───────────────────────────────────────────────────

describe("duplicate detection", () => {
  it("keys on calendar day, amount, and normalized description", () => {
    expect(
      duplicateKey({
        date: aug31,
        amount: 1500,
        description: "Foodpanda Order",
      }),
    ).toBe(
      duplicateKey({
        date: aug31,
        amount: 1500,
        description: "  foodpanda   order ",
      }),
    );
    expect(
      duplicateKey({
        date: aug31,
        amount: 1500,
        description: "Foodpanda Order",
      }),
    ).not.toBe(
      duplicateKey({
        date: aug31,
        amount: 1600,
        description: "Foodpanda Order",
      }),
    );
    expect(
      duplicateKey({
        date: aug31,
        amount: 1500,
        description: "Foodpanda Order",
      }),
    ).not.toBe(
      duplicateKey({
        date: aug30,
        amount: 1500,
        description: "Foodpanda Order",
      }),
    );
  });

  it("flags rows matching existing transactions and earlier rows in the batch", () => {
    const foodpanda = {
      date: aug5,
      amount: 1500,
      description: "Foodpanda order",
    };
    const flags = detectDuplicates(
      [
        foodpanda,
        foodpanda, // duplicate of the first batch row
        { date: aug5, amount: 1500, description: "Careem ride" }, // different description
      ],
      [
        {
          date: new Date(2026, 7, 6).getTime(),
          amount: 900,
          description: "Grocery Imtiaz",
        },
      ],
    );
    expect(flags).toEqual([false, true, false]);
  });

  it("flags rows that already exist in the user's transactions", () => {
    const existing = {
      date: aug5,
      amount: 1500,
      description: "Foodpanda order",
    };
    expect(detectDuplicates([existing], [existing])).toEqual([true]);
  });
});

// ─── Batch cap ─────────────────────────────────────────────────────────────

describe("MAX_IMPORT_ROWS", () => {
  it("caps import batches at 500 rows (AGENTS.md Phase 12)", () => {
    expect(MAX_IMPORT_ROWS).toBe(500);
  });
});
