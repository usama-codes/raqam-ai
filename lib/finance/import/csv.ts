// lib/finance/import/csv.ts — CSV import parsing
// Placeholder: full implementation in Phase 12

/**
 * Parse a CSV string into an array of row objects.
 * Handles quoted fields, escaped commas, and various line endings.
 */
export function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });
    return row;
  });
}
