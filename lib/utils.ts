import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detect whether text is primarily Latin-script (English, Roman Urdu, etc.)
 * vs. Arabic/Urdu script. Used to set per-message text direction and font
 * in the chat UI.
 */
export function isLatinScript(text: string): boolean {
  const stripped = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!stripped) return false;
  const latinCount = (stripped.match(/[\u0041-\u024F]/g) || []).length;
  return latinCount > stripped.length / 2;
}
