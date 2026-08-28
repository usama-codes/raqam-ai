"use client";

import * as React from "react";
import { useLanguage } from "@/components/LanguageProvider";

// Import page — placeholder, full implementation in Phase 12
export default function ImportPage() {
  const { t } = useLanguage();
  return (
    <div>
      <header className="sticky top-0 z-[5] flex flex-col gap-4 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            {t("import.title")}
          </h1>
          <p className="text-[14px] text-[#6B7A70]">{t("import.subtitle")}</p>
        </div>
      </header>
      <div className="px-6 py-7 sm:px-10">
        <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-dashed border-[#CBD9CF] p-6">
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
            {t("import.uploadLabel")}
          </span>
          <h3 className="text-[18px] font-bold">{t("import.uploadTitle")}</h3>
          <p className="text-[14px] leading-[2] text-[#6B7A70]">
            {t("import.uploadDesc")}
          </p>
          <button className="cursor-pointer rounded-[9px] border-0 bg-[#F1EEE4] px-4 py-2.5 text-[14px]">
            {t("import.selectFile")}
          </button>
        </div>
      </div>
    </div>
  );
}
