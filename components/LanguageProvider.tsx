"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ur, type TranslationKey } from "@/lib/i18n/ur";
import { en } from "@/lib/i18n/en";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type Language = "ur" | "en";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  dir: "rtl" | "ltr";
  isLoaded: boolean;
}

// ─── Context ────────────────────────────────────────────────────────────────────

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────────

/**
 * LanguageProvider — manages i18n state for the authenticated app.
 *
 * Reads `preferredLanguage` from the Convex user document on mount,
 * applies `lang`/`dir` to `<html>`, and exposes a `t()` function
 * plus `setLanguage()` toggle that persists to Convex.
 *
 * Must be rendered inside ConvexClientProvider and ConvexGuardWrapper
 * (so that the Convex user query is available).
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const user = useQuery(api.users.getCurrentUser);
  const updateProfile = useMutation(api.users.updateProfile);

  // Optimistic override — null means "use Convex value"
  const [optimisticLang, setOptimisticLang] = React.useState<Language | null>(
    null,
  );

  // Derive language from user document (or optimistic override)
  const language: Language = optimisticLang ?? user?.preferredLanguage ?? "ur";
  const isLoaded = !!user;
  const dir = language === "ur" ? "rtl" : "ltr";

  // Apply lang and dir to <html> element (external system sync — valid effect use)
  React.useEffect(() => {
    const html = document.documentElement;
    html.lang = language;
    html.dir = dir;
  }, [language, dir]);

  // Translation function
  const t = React.useCallback(
    (key: TranslationKey): string => {
      const dict = language === "ur" ? ur : en;
      return dict[key] ?? ur[key] ?? key;
    },
    [language],
  );

  // Set language and persist to Convex
  const setLanguage = React.useCallback(
    (lang: Language) => {
      setOptimisticLang(lang);
      updateProfile({ preferredLanguage: lang }).catch(() => {
        setOptimisticLang(null); // Revert on failure
      });
    },
    [updateProfile],
  );

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
    dir,
    isLoaded,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Access the current language context.
 * Must be used inside a LanguageProvider.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
