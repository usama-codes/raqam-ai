"use client";

import * as React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface NotificationPrefs {
  budget80: boolean;
  budget100: boolean;
  billReminder: boolean;
  unusualSpend: boolean;
  monthlySummary: boolean;
}

export type NotificationPrefKey = keyof NotificationPrefs;

// Absent prefs ⇒ everything on (matches convex/proactive.ts DEFAULT_PREFS).
const DEFAULT_PREFS: NotificationPrefs = {
  budget80: true,
  budget100: true,
  billReminder: true,
  unusualSpend: true,
  monthlySummary: true,
};

export interface UseNotificationPrefsReturn {
  prefs: NotificationPrefs;
  loading: boolean;
  setPref: (key: NotificationPrefKey, value: boolean) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useNotificationPrefs(): UseNotificationPrefsReturn {
  const user = useQuery(api.users.getCurrentUser) as
    | { notificationPrefs?: Partial<NotificationPrefs> | null }
    | null
    | undefined;
  const updatePrefs = useMutation(api.users.updateNotificationPrefs);

  // Optimistic override — null means "use the server value".
  const [optimistic, setOptimistic] = React.useState<NotificationPrefs | null>(
    null,
  );

  const serverPrefs: NotificationPrefs = React.useMemo(
    () => ({ ...DEFAULT_PREFS, ...(user?.notificationPrefs ?? {}) }),
    [user],
  );

  const prefs = optimistic ?? serverPrefs;

  const setPref = React.useCallback(
    (key: NotificationPrefKey, value: boolean) => {
      const next = { ...prefs, [key]: value };
      setOptimistic(next);
      updatePrefs({ prefs: next }).catch(() => setOptimistic(null));
    },
    [prefs, updatePrefs],
  );

  return {
    prefs,
    loading: user === undefined,
    setPref,
  };
}
