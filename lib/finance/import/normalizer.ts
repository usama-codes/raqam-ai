// lib/finance/import/normalizer.ts — Import normalization
// Maps various bank statement CSV column names to the internal Transaction format.
// Placeholder: full implementation in Phase 12

export interface NormalizedTransaction {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: number; // Unix ms
}

/**
 * Known column name mappings for common Pakistani bank statements.
 */
const COLUMN_MAP: Record<string, keyof NormalizedTransaction> = {
  // English variants
  description: "description",
  narration: "description",
  details: "description",
  amount: "amount",
  debit: "amount",
  credit: "amount",
  date: "date",
  "transaction date": "date",
  "value date": "date",
  // Type inference
  type: "type",
};

/**
 * Normalize a raw CSV row into the internal transaction format.
 */
export function normalizeRow(
  row: Record<string, string>,
): NormalizedTransaction | null {
  const normalized: Partial<NormalizedTransaction> = {};

  for (const [key, value] of Object.entries(row)) {
    const mapped = COLUMN_MAP[key.toLowerCase()];
    if (mapped && value) {
      if (mapped === "amount") {
        const amount = parseFloat(value.replace(/,/g, ""));
        if (isNaN(amount)) return null;
        normalized.amount = Math.abs(amount);
        // Infer type from debit/credit column or sign
        if (key.toLowerCase() === "credit" && parseFloat(value) > 0) {
          normalized.type = "income";
        } else if (key.toLowerCase() === "debit" && parseFloat(value) > 0) {
          normalized.type = "expense";
        }
      } else if (mapped === "date") {
        const parsed = new Date(value).getTime();
        if (isNaN(parsed)) return null;
        normalized.date = parsed;
      } else {
        normalized[mapped] = value as never;
      }
    }
  }

  if (!normalized.amount || !normalized.date || !normalized.description)
    return null;
  if (!normalized.type) normalized.type = "expense";

  return normalized as NormalizedTransaction;
}
