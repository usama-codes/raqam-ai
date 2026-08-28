/* ── Settings page — pixel-accurate replication ── */

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className="flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px]"
      style={{
        background: on ? "#0F5132" : "#DCD6C8",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span className="h-5 w-5 rounded-full bg-white" />
    </span>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-col gap-1 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <h1 className="text-[26px] font-bold leading-[1.7]">ترتیبات</h1>
        <p className="text-[14px] text-[#6B7A70]">زبان، اطلاعات اور ڈیٹا</p>
      </header>

      <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-7 sm:px-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* Language & format */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">زبان اور ترتیب</h2>
            <div className="flex gap-3">
              <button className="flex flex-1 flex-col gap-1 rounded-[12px] border border-[#0F5132] bg-[#F4F8F5] p-4 text-right">
                <span className="text-[17px] font-bold">اردو</span>
                <span className="text-[13px] text-[#4C5A52]">
                  دائیں سے بائیں · نستعلیق سرخیاں
                </span>
              </button>
              <button className="flex flex-1 flex-col gap-1 rounded-[12px] border border-[#DCD6C8] bg-[#FBF9F4] p-4 text-right">
                <span className="font-[var(--font-manrope)] text-[17px] font-bold">
                  English
                </span>
                <span className="font-[var(--font-manrope)] text-[13px] text-[#4C5A52]">
                  Left to right · Manrope
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">اعداد اردو ہندسوں میں</span>
                <span className="text-[13px] text-[#8A9690]">
                  ۱۲۳ کے بجائے 123 — پہلے سے بند
                </span>
              </div>
              <Toggle on={false} />
            </div>
            <div className="flex items-center justify-between border-t border-[#F1EEE4] pt-3.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px]">کرنسی</span>
                <span className="text-[13px] text-[#8A9690]">
                  پاکستانی روپیہ — Rs. 1,200
                </span>
              </div>
              <span className="rounded-[9px] border border-[#DCD6C8] px-3.5 py-[9px] text-[14px]">
                PKR ▾
              </span>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-[19px] font-bold">خود بخود اطلاعات</h2>
              <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
                معاون آپ کو خود سے کب مطلع کرے۔ ہر ایک الگ سے بند کر سکتے ہیں۔
              </p>
            </div>
            {[
              { label: "بجٹ 80٪ پر انتباہ", on: true },
              { label: "بجٹ 100٪ پر اطلاع", on: true },
              { label: "بلوں کی یاد دہانی (3 دن پہلے)", on: true },
              { label: "غیر معمولی خرچ کی نشاندہی", on: false },
              { label: "مہینے کا خلاصہ", on: true },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between ${i > 0 ? "border-t border-[#F1EEE4] pt-3.5" : ""}`}
              >
                <span className="text-[15px]">{item.label}</span>
                <Toggle on={item.on} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* AI permissions */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <h2 className="text-[19px] font-bold">معاون کے اختیارات</h2>
            <div className="flex flex-col gap-2.5 text-[14px] leading-[1.95] text-[#4C5A52]">
              {[
                {
                  ok: true,
                  text: "لین دین شامل، تبدیل یا حذف کرنے کی تجویز — تصدیق کے بعد",
                },
                {
                  ok: true,
                  text: "بجٹ اور اہداف بنانے کی تجویز — تصدیق کے بعد",
                },
                { ok: true, text: "زمرہ درست کرنے کی تجویز" },
                {
                  ok: false,
                  text: "پیسے منتقل کرنا یا ادائیگی کرنا — کبھی نہیں",
                },
                { ok: false, text: "بغیر تصدیق کوئی تبدیلی — کبھی نہیں" },
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
            <h2 className="text-[19px] font-bold">ڈیٹا اور حساب</h2>
            <div className="flex flex-col gap-3 text-[15px]">
              {[
                { label: "معاون کی گفتگو کا ریکارڈ دیکھیں", danger: false },
                { label: "میرے ڈیٹا کی نقل حاصل کریں", danger: false },
                { label: "اکاؤنٹ سے نکلیں", danger: false },
                { label: "اکاؤنٹ اور تمام ڈیٹا حذف کریں", danger: true },
              ].map((btn) => (
                <button
                  key={btn.label}
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
              DISCLAIMER
            </span>
            <p className="text-[14px] leading-[2] text-[#4C5A52]">
              رقم-AI مالی خواندگی کا معاون ہے، لائسنس شدہ مالی مشیر نہیں۔ سرمایہ
              کاری یا قرض کے فیصلوں سے پہلے مستند مشورہ لیں۔
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
