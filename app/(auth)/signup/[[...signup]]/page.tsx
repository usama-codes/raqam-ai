"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="w-full max-w-[520px] px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[19px] font-bold text-[#0B3B26]">
            ر
          </div>
          <div className="flex flex-col">
            <span className="font-[var(--font-noto-nastaliq-urdu)] text-[20px] font-bold leading-[1.6] text-[#14231B]">
              رقم
            </span>
            <span className="font-[var(--font-manrope)] text-[10px] tracking-[.22em] text-[#6B7A70]">
              RAQAM&nbsp;AI
            </span>
          </div>
        </div>
      </div>

      {/* Clerk SignUp */}
      <div className="flex justify-center">
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "w-full rounded-2xl border border-[#E7E2D6] bg-white shadow-none",
              headerTitle: "text-[20px] font-bold",
              headerSubtitle: "text-[14px] text-[#6B7A70]",
              formButtonPrimary:
                "rounded-[10px] bg-[#0F5132] text-white hover:bg-[#14231B]",
              footerActionLink: "text-[#0F5132] font-semibold",
              socialButtonsBlockButton:
                "rounded-full border border-[#DCD6C8] bg-white p-3 hover:bg-[#FBF9F4] hover:border-[#0F5132] transition-colors",
              formFieldLabel: "text-[14px] text-[#4C5A52]",
              formFieldInput:
                "rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] text-[15px]",
              phoneInputBox:
                "rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]",
              countrySelectButton:
                "rounded-[10px] border-0 bg-transparent hover:bg-[#F1EEE4]",
              countrySelectDropdown:
                "rounded-[10px] border border-[#E7E2D6] bg-white shadow-lg",
              countrySelectSearchInput:
                "rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]",
              otpCodeFieldInput:
                "rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] text-center text-[18px] tracking-[.3em]",
            },
          }}
        />
      </div>

      {/* Info */}
      <p className="mt-4 text-center text-[13px] leading-[1.9] text-[#8A9690]">
        اکاؤنٹ بنانے کے بعد آپ اپنی آمدنی، اخراجات اور بچت کے اہداف ترتیب دیں
        گے۔
      </p>
    </div>
  );
}
