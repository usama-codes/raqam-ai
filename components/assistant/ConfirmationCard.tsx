"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";
import type { TranslationKey } from "@/lib/i18n/ur";
import type { ActionType } from "@/lib/ai/action-schemas";
import { ACTION_TYPE_LABELS } from "@/lib/ai/action-schemas";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PendingAction {
  id: string;
  actionType: ActionType;
  parameters: string; // JSON-encoded
  userFacingMessage: string;
  status: "pending" | "confirmed" | "rejected" | "executed" | "failed";
  resultMessage?: string;
}

interface ConfirmationCardProps {
  action: PendingAction;
  onConfirm: (actionId: string) => Promise<void>;
  onReject: (actionId: string) => Promise<void>;
  disabled?: boolean;
}

// ─── Action icon map ────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<ActionType, string> = {
  createTransaction: "➕",
  deleteTransaction: "🗑️",
  createSavingsGoal: "🎯",
};

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * ConfirmationCard — displays an AI-proposed action for user approval.
 *
 * Shows the action type, a human-readable summary, key parameters,
 * and Confirm / Reject buttons. No mutation executes without explicit
 * user confirmation — this is the Phase 9 confirmation gate.
 */
export function ConfirmationCard({
  action,
  onConfirm,
  onReject,
  disabled = false,
}: ConfirmationCardProps) {
  const { t, language } = useLanguage();
  const [confirming, setConfirming] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);

  const label =
    ACTION_TYPE_LABELS[action.actionType]?.[language] ?? action.actionType;
  const icon = ACTION_ICONS[action.actionType] ?? "⚡";

  // Parse parameters for display
  let params: Record<string, unknown> = {};
  try {
    params = JSON.parse(action.parameters);
  } catch {
    // Malformed JSON — show raw message only
  }

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(action.id);
    } catch {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await onReject(action.id);
    } catch {
      setRejecting(false);
    }
  };

  // Resolved state: action was already confirmed/rejected/executed
  if (action.status !== "pending") {
    return <ResolvedCard action={action} language={language} t={t} />;
  }

  return (
    <div className="mt-2 flex max-w-[78%] flex-col gap-2 self-end">
      <div className="rounded-[16px_16px_4px_16px] border-2 border-[#E8B931] bg-[#FDF8EC] px-5 py-4">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[18px]">{icon}</span>
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.14em] text-[#6B5B2E]">
            {t("assistant.actionProposed")}
          </span>
          <span className="rounded-full bg-[#FDF3D8] px-2 py-0.5 text-[11px] font-medium text-[#6B5B2E]">
            {label}
          </span>
        </div>

        {/* User-facing message */}
        <p className="mb-3 text-[15px] font-reading leading-[2.2] text-[#4C5A52]">
          {action.userFacingMessage}
        </p>

        {/* Parameter summary */}
        {Object.keys(params).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {action.actionType === "createTransaction" && (
              <>
                <ParamBadge
                  label={t("assistant.actionAmount")}
                  value={`Rs. ${Number(params.amount ?? 0).toLocaleString()}`}
                />
                <ParamBadge
                  label={t("assistant.actionType")}
                  value={
                    params.type === "income"
                      ? t("transactions.income")
                      : t("transactions.expense")
                  }
                />
                <ParamBadge
                  label={t("transactions.colDescription")}
                  value={String(params.description ?? "")}
                />
                {params.categoryName && (
                  <ParamBadge
                    label={t("transactions.colCategory")}
                    value={String(params.categoryName)}
                  />
                )}
              </>
            )}
            {action.actionType === "deleteTransaction" && (
              <>
                <ParamBadge
                  label={t("transactions.colDescription")}
                  value={String(params.description ?? "")}
                />
                {params.amount && (
                  <ParamBadge
                    label={t("assistant.actionAmount")}
                    value={`Rs. ${Number(params.amount).toLocaleString()}`}
                  />
                )}
              </>
            )}
            {action.actionType === "createSavingsGoal" && (
              <>
                <ParamBadge
                  label={t("goals.dialog.name")}
                  value={String(params.name ?? "")}
                />
                <ParamBadge
                  label={t("goals.dialog.targetAmount")}
                  value={`Rs. ${Number(params.targetAmount ?? 0).toLocaleString()}`}
                />
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleConfirm}
            disabled={disabled || confirming || rejecting}
            className="rounded-[10px] bg-[#0F5132] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#14231B] disabled:opacity-50"
          >
            {confirming
              ? t("assistant.actionConfirming")
              : t("assistant.actionConfirm")}
          </button>
          <button
            onClick={handleReject}
            disabled={disabled || confirming || rejecting}
            className="rounded-[10px] border border-[#DCD6C8] bg-white px-5 py-2.5 text-[14px] font-medium text-[#6B7A70] hover:bg-[#F7F4EC] disabled:opacity-50"
          >
            {rejecting
              ? t("assistant.actionRejecting")
              : t("assistant.actionReject")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function ParamBadge({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6EFE9] px-2.5 py-1 text-[12px]">
      <span className="text-[#8A9690]">{label}:</span>
      <span className="font-medium text-[#0F5132]">{value}</span>
    </span>
  );
}

/**
 * Resolved card — shown after the action has been confirmed, rejected, executed, or failed.
 */
function ResolvedCard({
  action,
  language,
  t,
}: {
  action: PendingAction;
  language: string;
  t: (key: TranslationKey) => string;
}) {
  const isExecuted = action.status === "executed";
  const isRejected = action.status === "rejected";
  const isFailed = action.status === "failed";

  const statusColor = isExecuted
    ? "border-[#22c55e] bg-[#F0FDF4]"
    : isRejected
      ? "border-[#DCD6C8] bg-[#F7F4EC]"
      : isFailed
        ? "border-[#ef4444] bg-[#FEF2F2]"
        : "border-[#DCD6C8] bg-[#F7F4EC]";

  const statusLabel = isExecuted
    ? t("assistant.actionExecuted")
    : isRejected
      ? t("assistant.actionRejected")
      : isFailed
        ? t("assistant.actionFailed")
        : action.status;

  const icon = ACTION_ICONS[action.actionType] ?? "⚡";
  const label =
    ACTION_TYPE_LABELS[action.actionType]?.[language as "ur" | "en"] ??
    action.actionType;

  return (
    <div className="mt-2 flex max-w-[78%] flex-col gap-2 self-end">
      <div
        className={`rounded-[16px_16px_4px_16px] border-2 ${statusColor} px-5 py-4 opacity-80`}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[18px]">{icon}</span>
          <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium text-[#6B7A70]">
            {label}
          </span>
          <span className="text-[11px] tracking-[.14em] text-[#8A9690]">
            {statusLabel}
          </span>
        </div>
        <p className="text-[14px] font-reading leading-[2] text-[#4C5A52]">
          {isExecuted && action.resultMessage
            ? action.resultMessage
            : action.userFacingMessage}
        </p>
        {isFailed && action.resultMessage && (
          <p className="mt-1 text-[13px] text-[#B3261E]">
            {action.resultMessage}
          </p>
        )}
      </div>
    </div>
  );
}
