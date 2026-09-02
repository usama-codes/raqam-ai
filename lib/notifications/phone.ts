// lib/notifications/phone.ts — Pakistani phone-number normalization (shared).
//
// Used by the settings page (client) and Convex functions (server) to turn
// whatever the user typed into E.164 (+92XXXXXXXXXX) before it is stored as the
// SMS delivery target. Pure: no Convex, no DOM, no Node APIs.

/**
 * Normalize a user-entered Pakistani phone number to E.164 (+92XXXXXXXXXX).
 * Accepts: "0300 1234567", "0300-1234567", "+923001234567", "923001234567",
 * "3001234567". Returns null when the number cannot be a Pakistani mobile.
 */
export function normalizePakistaniPhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[\s\-().]/g, "");
  const hadPlus = digits.startsWith("+");
  digits = digits.replace(/^\+/, "");

  // Reject anything containing non-digits at this point.
  if (!/^\d+$/.test(digits)) return null;

  if (hadPlus || digits.startsWith("92")) {
    // +92 / 92 form: strip leading 92, expect exactly 10 digits after (3XX + 7).
    const rest = digits.startsWith("92") ? digits.slice(2) : digits;
    if (/^3\d{9}$/.test(rest)) return `+92${rest}`;
    return null;
  }

  if (digits.startsWith("0")) {
    // Local form: 03XXXXXXXXX (11 digits) → +923XXXXXXXXX
    if (/^03\d{9}$/.test(digits)) return `+92${digits.slice(1)}`;
    return null;
  }

  if (/^3\d{9}$/.test(digits)) {
    // Bare national form without the leading zero.
    return `+92${digits}`;
  }

  return null;
}
