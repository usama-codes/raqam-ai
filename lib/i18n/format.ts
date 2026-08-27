// lib/i18n/format.ts — PKR, date, and number formatters

/**
 * Format a number as Pakistani Rupees (PKR).
 * Example: formatPKR(1200) => "Rs. 1,200"
 */
export function formatPKR(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-PK")}`;
}

/**
 * Format a Unix ms timestamp as a date string.
 * Uses Urdu locale when `locale` is "ur", otherwise English.
 */
export function formatDate(
  timestamp: number,
  locale: "ur" | "en" = "ur",
): string {
  const date = new Date(timestamp);
  if (locale === "ur") {
    return date.toLocaleDateString("ur-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a number with locale-aware separators.
 */
export function formatNumber(
  value: number,
  locale: "ur" | "en" = "en",
): string {
  return value.toLocaleString(locale === "ur" ? "ur-PK" : "en-PK");
}

/**
 * Format a percentage value.
 * Example: formatPercent(23.456) => "23.5%"
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
