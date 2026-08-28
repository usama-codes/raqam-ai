import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="w-full max-w-[440px] px-4">
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

      {/* Sign-in card */}
      <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-[26px]">
        <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
          SIGN IN · داخلہ
        </span>
        <h3 className="text-[20px] font-bold leading-[1.85]">
          اپنے اکاؤنٹ میں داخل ہوں
        </h3>
        <label className="flex flex-col gap-1.5 text-[14px] text-[#4C5A52]">
          ای میل یا موبائل نمبر
          <input
            placeholder="0300 1234567"
            className="rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-3 text-[15px]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[14px] text-[#4C5A52]">
          پاس ورڈ
          <input
            type="password"
            defaultValue="••••••••"
            className="rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-3 text-[15px]"
          />
        </label>
        <Link
          href="/dashboard"
          className="mt-2 block rounded-[10px] border-0 bg-[#0F5132] py-[13px] text-center text-[15px] font-semibold text-white hover:bg-[#14231B]"
        >
          داخل ہوں
        </Link>
        <span className="text-[13px] leading-[1.9] text-[#8A9690]">
          ہر صارف کا ڈیٹا مکمل الگ رہتا ہے۔ کوئی صارف دوسرے کے لین دین نہیں دیکھ
          سکتا۔
        </span>
      </div>

      {/* Demo link */}
      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[#0B3B26] p-[26px] text-[#EAF1EB]">
        <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#E8B931]">
          DEMO ACCOUNT · ججنگ کے لیے
        </span>
        <h3 className="text-[20px] font-bold leading-[1.85]">
          تیار شدہ ڈیمو صارف
        </h3>
        <p className="text-[15px] leading-[2.05] text-[#B9CFC1]">
          چھ مہینوں کا حقیقی نوعیت کا ڈیٹا: 214 لین دین، تین بجٹ مہینے، تین
          اہداف اور ایک درآمد شدہ اسٹیٹمنٹ۔
        </p>
        <Link
          href="/dashboard"
          className="rounded-[10px] border-0 bg-[#E8B931] py-3 text-center text-[15px] font-bold text-[#0B3B26] hover:bg-[#F2C846]"
        >
          ڈیمو شروع کریں
        </Link>
      </div>
    </div>
  );
}
