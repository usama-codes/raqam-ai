"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/components/LanguageProvider";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDescription?: string;
  transactionAmount?: string;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  transactionDescription,
  transactionAmount,
  onConfirm,
}: Props) {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-[#E7E2D6] bg-white sm:max-w-sm">
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-[18px] font-bold text-[#14231B]">
            {t("transactions.delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[14px] leading-[2] text-[#6B7A70]">
            {transactionDescription && (
              <span className="block font-medium text-[#14231B]">
                {transactionDescription}
                {transactionAmount && (
                  <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                    {" "}
                    — Rs. {transactionAmount}
                  </span>
                )}
              </span>
            )}
            {t("transactions.delete.warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-2.5">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="rounded-[10px] border-[#DCD6C8] bg-white px-4 py-2.5 text-[14px] hover:bg-[#FBF9F4]"
          >
            {t("transactions.delete.keep")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-[10px] border-0 bg-[#B3261E] px-5 py-2.5 text-[14px] text-white hover:bg-[#8C1E18]"
          >
            {t("transactions.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
