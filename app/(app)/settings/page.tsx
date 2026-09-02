"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/components/shared/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useNotificationSettings,
  type NotificationSettings,
} from "@/hooks/useNotificationSettings";
import { normalizePakistaniPhone } from "@/lib/notifications/phone";

function Toggle({
  on,
  onChange,
  disabled,
}: {
  on: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition-colors ${
        disabled ? "opacity-40" : ""
      }`}
      style={{
        background: on ? "#0F5132" : "#DCD6C8",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span className="h-5 w-5 rounded-full bg-white transition-all" />
    </button>
  );
}

/**
 * SMS alerts card — the consent surface for proactive notifications.
 * The master switch requires a saved phone number; individual alert kinds are
 * meaningless while it is off (mirrors the server-side consent record, §8).
 */
function SmsCard() {
  const { t } = useLanguage();
  const { addToast } = useToast();
  const { settings, saveSettings, sendTestMessage, sendingTest } =
    useNotificationSettings();

  // Draft synced from the server value whenever it changes (React's
  // adjust-state-during-render pattern — no effects, no stale toggles).
  const [synced, setSynced] = React.useState<{
    source: NotificationSettings | null;
    draft: NotificationSettings | null;
  }>({ source: null, draft: null });
  if (settings !== synced.source) {
    setSynced({ source: settings, draft: settings });
  }
  const draft = synced.draft;

  // Phone input keeps its own draft until saved (never mutates consent early).
  const [phoneInput, setPhoneInput] = React.useState<string | null>(null);
  const phone = phoneInput ?? settings?.smsPhone ?? "";

  const update = async (patch: Partial<NotificationSettings>) => {
    if (!draft) return;
    const next = { ...draft, ...patch };
    setSynced((s) => ({ ...s, draft: next }));
    const result = await saveSettings(next);
    if (!result.ok) {
      // Revert to the last server-confirmed value on failure.
      setSynced((s) => ({ ...s, draft: s.source }));
      addToast({
        type: "error",
        title: t("settings.saveFailed"),
        description: result.error,
      });
    }
  };

  const toggleMaster = async () => {
    if (!draft) return;
    if (!draft.smsEnabled && !draft.smsPhone) {
      // Consent needs a destination first — the server would refuse anyway.
      addToast({ type: "warning", title: t("settings.smsInvalidPhone") });
      return;
    }
    await update({ smsEnabled: !draft.smsEnabled });
  };

  const savePhone = async () => {
    if (!draft) return;
    const normalized = phone.trim()
      ? normalizePakistaniPhone(phone.trim())
      : null;
    if (phone.trim() && !normalized) {
      addToast({ type: "error", title: t("settings.smsInvalidPhone") });
      return;
    }
    const result = await saveSettings({
      ...draft,
      smsPhone: normalized ?? "",
    });
    setPhoneInput(null);
    if (result.ok) {
      addToast({ type: "success", title: t("settings.savedToast") });
    } else {
      addToast({
        type: "error",
        title: t("settings.saveFailed"),
        description: result.error,
      });
    }
  };

  const runTest = async () => {
    const result = await sendTestMessage();
    if (result.ok) {
      addToast({ type: "success", title: t("settings.smsTestSent") });
    } else {
      addToast({
        type: "error",
        title: t("settings.smsTestFailed"),
        description: result.error ?? undefined,
      });
    }
  };

  const masterOn = !!draft?.smsEnabled;
  const canTest =
    !sendingTest && !!settings?.smsEnabled && !!settings?.smsPhone;

  const alertRows: Array<{
    label: string;
    on: boolean;
    key: keyof NotificationSettings;
  }> = [
    {
      label: t("settings.notifBudget80"),
      on: !!draft?.budgetApproaching,
      key: "budgetApproaching",
    },
    {
      label: t("settings.notifBudget100"),
      on: !!draft?.budgetReached,
      key: "budgetReached",
    },
    {
      label: t("settings.notifBillReminder"),
      on: !!draft?.billReminders,
      key: "billReminders",
    },
    {
      label: t("settings.notifUnusualSpend"),
      on: !!draft?.unusualSpend,
      key: "unusualSpend",
    },
    {
      label: t("settings.notifMonthlySummary"),
      on: !!draft?.monthlySummary,
      key: "monthlySummary",
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[19px] font-bold">
          {t("settings.notificationsTitle")}
        </h2>
        <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
          {t("settings.notificationsDesc")}
        </p>
      </div>

      {/* Master consent switch */}
      <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[#E7E2D6] bg-[#FBF9F4] p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">
            {t("settings.smsEnable")}
          </span>
          <span className="text-[13px] text-[#6B7A70]">
            {t("settings.smsEnableDesc")}
          </span>
        </div>
        <Toggle on={masterOn} onChange={toggleMaster} />
      </div>

      {/* Phone + test message (only while consented) */}
      {masterOn && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-semibold">
              {t("settings.smsPhoneLabel")}
            </label>
            <div className="flex gap-2">
              <input
                dir="ltr"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={t("settings.smsPhonePlaceholder")}
                className="flex-1 rounded-[10px] border border-[#DCD6C8] bg-white px-3.5 py-[11px] text-left text-[15px] outline-none focus:border-[#0F5132]"
              />
              <button
                onClick={savePhone}
                className="shrink-0 cursor-pointer rounded-[10px] bg-[#0F5132] px-4 py-[11px] text-[14px] font-semibold text-white"
              >
                {t("settings.save")}
              </button>
            </div>
            <span className="text-[12px] text-[#8A9690]">
              {t("settings.smsPhoneHelp")}
            </span>
          </div>
          <button
            onClick={runTest}
            disabled={!canTest}
            className="cursor-pointer rounded-[10px] border border-[#0F5132]/30 bg-[#F4F8F5] py-[11px] text-[14px] font-semibold text-[#0F5132] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingTest
              ? t("settings.smsTestSending")
              : t("settings.smsTest")}
          </button>
        </div>
      )}

      {/* Individual alert kinds */}
      <div className="flex flex-col">
        {alertRows.map((row, i) => (
          <div
            key={row.key}
            className={`flex items-center justify-between ${i > 0 ? "border-t border-[#F1EEE4] pt-3.5" : ""} ${i < alertRows.length - 1 ? "pb-3.5" : ""}`}
          >
            <span className="text-[15px]">{row.label}</span>
            <Toggle
              on={row.on}
              disabled={!masterOn}
              onChange={() => update({ [row.key]: !row.on })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { signOut } = useAuth();

  const isUrdu = language === "ur";

  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-1 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <h1 className="text-[26px] font-bold leading-[1.7]">
          {t("settings.title")}
        </h1>
        <p className="text-[14px] text-[#6B7A70]">{t("settings.subtitle")}</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-7 sm:px-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* Language & format */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">
              {t("settings.languageSection")}
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => setLanguage("ur")}
                className={`flex flex-1 flex-col gap-1 rounded-[12px] border p-4 text-right transition-colors ${
                  isUrdu
                    ? "border-[#0F5132] bg-[#F4F8F5]"
                    : "border-[#DCD6C8] bg-[#FBF9F4]"
                }`}
              >
                <span className="text-[17px] font-bold">
                  {t("settings.urduLabel")}
                </span>
                <span className="text-[13px] text-[#4C5A52]">
                  {t("settings.urduDesc")}
                </span>
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={`flex flex-1 flex-col gap-1 rounded-[12px] border p-4 text-right transition-colors ${
                  !isUrdu
                    ? "border-[#0F5132] bg-[#F4F8F5]"
                    : "border-[#DCD6C8] bg-[#FBF9F4]"
                }`}
              >
                <span className="font-[var(--font-manrope)] text-[17px] font-bold">
                  {t("settings.englishLabel")}
                </span>
                <span className="font-[var(--font-manrope)] text-[13px] text-[#4C5A52]">
                  {t("settings.englishDesc")}
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("settings.urduDigits")}</span>
                <span className="text-[13px] text-[#8A9690]">
                  {t("settings.urduDigitsDesc")}
                </span>
              </div>
              <Toggle on={false} />
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">{t("settings.currency")}</span>
                <span className="text-[13px] text-[#8A9690]">
                  {t("settings.currencyDesc")}
                </span>
              </div>
              <span className="rounded-[9px] border border-[#DCD6C8] px-3.5 py-[9px] text-[14px]">
                PKR ▾
              </span>
            </div>
          </div>

          {/* Notifications (SMS alerts — consent-backed, §8) */}
          <SmsCard />
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* AI permissions */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">
              {t("settings.aiPermissionsTitle")}
            </h2>
            <div className="flex flex-col gap-2.5 text-[14px] leading-[1.95] text-[#4C5A52]">
              {[
                { ok: true, text: t("settings.aiPerm1") },
                { ok: true, text: t("settings.aiPerm2") },
                { ok: true, text: t("settings.aiPerm3") },
                { ok: false, text: t("settings.aiPerm4") },
                { ok: false, text: t("settings.aiPerm5") },
              ].map((p) => (
                <div key={p.text} className="flex gap-2.5">
                  <span style={{ color: p.ok ? "#0F5132" : "#B3261E" }}>
                    {p.ok ? "✓" : "✕"}
                  </span>
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data management */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">{t("settings.dataTitle")}</h2>
            <div className="flex flex-col gap-3 text-[15px]">
              {[
                {
                  label: t("settings.dataViewConversations"),
                  danger: false,
                },
                { label: t("settings.dataExport"), danger: false },
                { label: t("settings.dataSignOut"), danger: false },
                { label: t("settings.dataDelete"), danger: true },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={
                    btn.label === t("settings.dataSignOut")
                      ? () => signOut()
                      : undefined
                  }
                  className={`cursor-pointer rounded-[10px] border py-[13px] px-4 text-right ${
                    btn.danger
                      ? "border-[#E7D6D4] bg-white text-[#B3261E]"
                      : "border-[#E7E2D6] bg-[#FBF9F4]"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-[#FBF9F4] p-[22px]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
              {t("settings.disclaimerLabel")}
            </span>
            <p className="text-[14px] leading-[2] text-[#4C5A52]">
              {t("settings.disclaimerText")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
