"use client";

// hooks/useNotificationSettings.ts — SMS alert consent + preferences.
//
// Wraps the public Convex functions in convex/notificationSettings.ts and the
// sendTestMessage action in convex/notifications.ts. The consent record itself
// lives server-side; this hook only reads and forwards it (§8 — authorization
// is never delegated to the client).

import * as React from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

// ─── Raw Convex shapes (needed because `api as any` erases inference) ──────────

interface RawNotificationSettings {
  smsEnabled: boolean;
  smsPhone: string | null;
  budgetApproaching: boolean;
  budgetReached: boolean;
  billReminders: boolean;
  monthlySummary: boolean;
  unusualSpend: boolean;
}

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface NotificationSettings {
  smsEnabled: boolean;
  smsPhone: string;
  budgetApproaching: boolean;
  budgetReached: boolean;
  billReminders: boolean;
  monthlySummary: boolean;
  unusualSpend: boolean;
}

export interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  /** True once the query resolves (defaults object counts as loaded). */
  loading: boolean;
  saveSettings: (
    settings: NotificationSettings,
  ) => Promise<{ ok: boolean; error?: string }>;
  sendTestMessage: () => Promise<{
    ok: boolean;
    error: string | null;
  }>;
  sendingTest: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────────────────

export function useNotificationSettings(): UseNotificationSettingsReturn {
  // Explicit cast avoids IDE failure to resolve the deep FilterApi generic chain
  // in the generated api.d.ts (tsc resolves correctly, but IDE TS server may not).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedApi = api as any;
  const raw = useQuery(typedApi.notificationSettings.get, {});

  const upsertMutation = useMutation(typedApi.notificationSettings.upsert);
  const testAction = useAction(typedApi.notifications.sendTestMessage);

  const [sendingTest, setSendingTest] = React.useState(false);

  const settings = React.useMemo<NotificationSettings | null>(() => {
    if (raw === undefined) return null;
    const s = raw as RawNotificationSettings;
    return {
      smsEnabled: s.smsEnabled,
      smsPhone: s.smsPhone ?? "",
      budgetApproaching: s.budgetApproaching,
      budgetReached: s.budgetReached,
      billReminders: s.billReminders,
      monthlySummary: s.monthlySummary,
      unusualSpend: s.unusualSpend,
    };
  }, [raw]);

  const saveSettings = React.useCallback(
    async (next: NotificationSettings) => {
      try {
        await upsertMutation({
          smsEnabled: next.smsEnabled,
          smsPhone: next.smsPhone.trim() || undefined,
          budgetApproaching: next.budgetApproaching,
          budgetReached: next.budgetReached,
          billReminders: next.billReminders,
          monthlySummary: next.monthlySummary,
          unusualSpend: next.unusualSpend,
        });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error:
            err instanceof Error
              ? err.message
              : "Could not save notification settings.",
        };
      }
    },
    [upsertMutation],
  );

  const sendTestMessage = React.useCallback(async () => {
    setSendingTest(true);
    try {
      const result = (await testAction({})) as {
        ok: boolean;
        error: string | null;
      };
      return result;
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Test message failed.",
      };
    } finally {
      setSendingTest(false);
    }
  }, [testAction]);

  return {
    settings,
    loading: raw === undefined,
    saveSettings,
    sendTestMessage,
    sendingTest,
  };
}
