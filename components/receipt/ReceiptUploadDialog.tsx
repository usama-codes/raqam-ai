"use client";

// components/receipt/ReceiptUploadDialog.tsx — Receipt image upload + OCR preview
// Uses Gemini vision to extract fields, then shows an editable form before sending.

import * as React from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/LanguageProvider";
import { Camera, Loader2, X } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ReceiptExtractedData {
  merchant: string;
  amount: string;
  date: string;
  description: string;
  categorySuggestion: string;
}

interface ReceiptUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendReceipt: (data: ReceiptExtractedData) => Promise<void>;
  sending?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_IMAGE_DIMENSION = 1600;

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReceiptUploadDialog({
  open,
  onOpenChange,
  onSendReceipt,
  sending,
}: ReceiptUploadDialogProps) {
  const { t } = useLanguage();
  const processReceiptAction = useAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (api as any).ai.processReceipt,
  );

  // State
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Editable fields — set directly after extraction, no effect needed
  const [merchant, setMerchant] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categorySuggestion, setCategorySuggestion] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper to reset all state
  const resetState = React.useCallback(() => {
    setImagePreview(null);
    setProcessing(false);
    setError(null);
    setMerchant("");
    setAmount("");
    setDate("");
    setDescription("");
    setCategorySuggestion("");
  }, []);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetState();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState],
  );

  // ── File handling ───────────────────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("receipt.invalidFormat"));
      return;
    }

    try {
      // Compress image client-side
      const base64 = await compressAndEncode(file);
      setImagePreview(`data:image/jpeg;base64,${base64}`);

      // Send to OCR
      setProcessing(true);
      const result = await processReceiptAction({ imageBase64: base64 });

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.extracted) {
        const data = result.extracted as ReceiptExtractedData;
        setMerchant(data.merchant);
        setAmount(data.amount);
        setDate(data.date);
        setDescription(data.description);
        setCategorySuggestion(data.categorySuggestion);
      } else {
        setError(t("receipt.noDataExtracted"));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("receipt.processingError"),
      );
    } finally {
      setProcessing(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!amount.trim()) return;
    await onSendReceipt({
      merchant: merchant.trim(),
      amount: amount.trim(),
      date: date.trim(),
      description: description.trim() || merchant.trim(),
      categorySuggestion: categorySuggestion.trim(),
    });
    onOpenChange(false);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasExtracted = !!merchant || !!amount; // fields populated after extraction

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("receipt.title")}</DialogTitle>
          <DialogDescription>{t("receipt.description")}</DialogDescription>
        </DialogHeader>

        {/* Step 1: No image selected yet — show upload area */}
        {!imagePreview && !processing && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#DCD6C8] bg-[#FBF9F4] transition-colors hover:border-[#0F5132] hover:bg-[#F1EEE4]"
            >
              <Camera className="h-8 w-8 text-[#6B7A70]" />
              <span className="text-[14px] text-[#6B7A70]">
                {t("receipt.tapToUpload")}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Step 2: Processing — show spinner over image */}
        {processing && (
          <div className="relative flex flex-col items-center gap-3 py-4">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Receipt"
                className="max-h-48 rounded-lg object-contain opacity-50"
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F5132]" />
              <span className="text-[14px] text-[#6B7A70]">
                {t("receipt.processing")}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Extracted data — show editable form */}
        {!processing && imagePreview && hasExtracted && (
          <div className="flex flex-col gap-3 py-2">
            {/* Small image preview with remove button */}
            <div className="relative inline-block self-start">
              <img
                src={imagePreview}
                alt="Receipt"
                className="h-20 rounded-lg object-contain"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  resetState();
                }}
                className="absolute -end-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#0F5132] text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#6B7A70]">
                  {t("receipt.merchant")}
                </span>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="rounded-lg border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-2 text-[14px] focus:border-[#0F5132] focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#6B7A70]">
                  {t("receipt.amount")}
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-lg border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-2 text-[14px] focus:border-[#0F5132] focus:outline-none"
                  placeholder="0"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#6B7A70]">
                  {t("receipt.date")}
                </span>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-2 text-[14px] focus:border-[#0F5132] focus:outline-none"
                  placeholder="YYYY-MM-DD"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#6B7A70]">
                  {t("receipt.notes")}
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-lg border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-2 text-[14px] focus:border-[#0F5132] focus:outline-none"
                />
              </label>
            </div>
          </div>
        )}

        {/* Step 3b: Image selected but no extraction result — show image + error */}
        {!processing && imagePreview && !hasExtracted && error && (
          <div className="flex flex-col items-center gap-3 py-4">
            <img
              src={imagePreview}
              alt="Receipt"
              className="max-h-40 rounded-lg object-contain"
            />
            <p className="text-center text-[13px] text-red-600">{error}</p>
            <button
              onClick={() => {
                setImagePreview(null);
                setError(null);
              }}
              className="rounded-lg bg-[#F1EEE4] px-4 py-2 text-[13px] text-[#6B7A70]"
            >
              {t("receipt.tryAgain")}
            </button>
          </div>
        )}

        {/* Error display (for initial upload errors) */}
        {!imagePreview && error && (
          <p className="text-center text-[13px] text-red-600">{error}</p>
        )}

        {/* Actions */}
        {hasExtracted && !processing && (
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={() => handleOpenChange(false)}
              className="flex-1 rounded-lg bg-[#F1EEE4] px-4 py-2.5 text-[14px] text-[#6B7A70]"
            >
              {t("receipt.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!amount.trim() || sending}
              className="flex-1 rounded-lg bg-[#0F5132] px-4 py-2.5 text-[14px] text-white hover:bg-[#14231B] disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t("receipt.sendToAssistant")
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Compress an image file client-side using Canvas API.
 * Resizes to max dimension and converts to JPEG for smaller base64 output.
 */
async function compressAndEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Calculate target dimensions
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const ratio = Math.min(
            MAX_IMAGE_DIMENSION / width,
            MAX_IMAGE_DIMENSION / height,
          );
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Draw to canvas
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        // Check size — if still too large, reduce quality
        const base64 = dataUrl.split(",")[1];
        if (base64.length * 0.75 > MAX_FILE_SIZE) {
          const smaller = canvas.toDataURL("image/jpeg", 0.5);
          resolve(smaller.split(",")[1]);
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
