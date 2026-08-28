import Link from "next/link";

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

      {/* Onboarding header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-[26px] font-bold leading-[1.7]">
          پہلی بار — تین قدم
        </h1>
        <p className="text-[14px] text-[#6B7A70]">نئے صارف کے لیے داخلہ</p>
      </div>

      {/* Step 1 */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#0F5132] bg-white p-6">
        <div className="flex items-center justify-between">
          <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#0F5132] font-[var(--font-manrope)] font-bold text-white">
            1
          </span>
          <span className="font-[var(--font-manrope)] text-[12px] text-[#0F5132]">
            جاری
          </span>
        </div>
        <h3 className="text-[19px] font-bold leading-[1.85]">
          ماہانہ آمدنی بتائیں
        </h3>
        <p className="text-[14px] leading-[2] text-[#4C5A52]">
          تنخواہ یا کاروبار سے ہر مہینے کتنا آتا ہے؟ یہی بنیاد بجٹ اور بچت کی
          شرح کا حساب دے گی۔
        </p>
        <input
          defaultValue="185,000"
          className="rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-3 font-[var(--font-manrope)] text-[18px] font-bold"
          readOnly
        />
        <span className="text-[13px] text-[#8A9690]">
          بعد میں ترتیبات سے تبدیل کر سکتے ہیں۔
        </span>
      </div>

      {/* Step 2 */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-6">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#F1EEE4] font-[var(--font-manrope)] font-bold text-[#6B7A70]">
          2
        </span>
        <h3 className="text-[19px] font-bold leading-[1.85]">
          پہلا بجٹ منتخب کریں
        </h3>
        <p className="text-[14px] leading-[2] text-[#4C5A52]">
          معاون آپ کی آمدنی کے مطابق ابتدائی حدیں تجویز کرے گا — آپ ہر زمرہ بدل
          سکتے ہیں۔
        </p>
        <div className="flex flex-col gap-2 text-[14px]">
          {[
            { name: "کرایہ", amount: "Rs. 45,000" },
            { name: "کھانا و گروسری", amount: "Rs. 34,000" },
            { name: "آمدورفت", amount: "Rs. 18,000" },
          ].map((b) => (
            <div
              key={b.name}
              className="flex justify-between rounded-[9px] bg-[#FBF9F4] px-3 py-2.5"
            >
              <span>{b.name}</span>
              <span className="font-[var(--font-manrope)]">{b.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step 3 */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-6">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[#F1EEE4] font-[var(--font-manrope)] font-bold text-[#6B7A70]">
          3
        </span>
        <h3 className="text-[19px] font-bold leading-[1.85]">
          پہلا خرچ بول کر لکھیں
        </h3>
        <p className="text-[14px] leading-[2] text-[#4C5A52]">
          مائیک دبائیں اور کہیں: &quot;آج 850 روپے پیٹرول پر خرچ ہوئے&quot;۔
          معاون سمجھ کر تصدیق مانگے گا۔
        </p>
        <div className="flex items-center gap-3 rounded-[12px] bg-[#0F5132] p-3.5 text-[#EAF1EB]">
          <span className="grid h-[34px] w-[34px] place-items-center rounded-full bg-[#E8B931] text-[#0B3B26]">
            ۩
          </span>
          <span className="text-[14px] leading-[1.9]">بولنا شروع کریں</span>
        </div>
        <Link
          href="/assistant"
          className="rounded-[9px] border-0 bg-[#F1EEE4] py-[11px] text-center text-[14px]"
        >
          لکھ کر آزمائیں
        </Link>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="flex-1 rounded-[10px] border-0 bg-[#0F5132] py-[14px] text-center text-[15px] font-semibold text-white hover:bg-[#14231B]"
        >
          ڈیش بورڈ پر جائیں
        </Link>
        <Link
          href="/login"
          className="rounded-[10px] border-0 bg-[#F1EEE4] px-5 py-[14px] text-center text-[15px] text-[#14231B] hover:bg-[#E6E3D8]"
        >
          پہلے سے اکاؤنٹ ہے؟
        </Link>
      </div>
    </div>
  );
}
