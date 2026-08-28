/* ── Goals page — pixel-accurate replication ── */

const goals = [
  {
    name: "عمرہ فنڈ",
    pct: 37,
    current: "128,000",
    target: "350,000",
    barColor: "#0F5132",
    badgeBg: "#E6EFE9",
    badgeFg: "#0F5132",
    details: [
      { label: "ہدف کی تاریخ", value: "جون 2027" },
      { label: "موجودہ رفتار", value: "Rs. 22,000 ماہانہ" },
      { label: "متوقع تکمیل", value: "مارچ 2027", valueColor: "#0F5132" },
    ],
  },
  {
    name: "ایمرجنسی فنڈ",
    pct: 48,
    current: "96,000",
    target: "200,000",
    barColor: "#0F5132",
    badgeBg: "#E6EFE9",
    badgeFg: "#0F5132",
    details: [
      { label: "ہدف کی تاریخ", value: "مقرر نہیں" },
      { label: "موجودہ رفتار", value: "Rs. 12,000 ماہانہ" },
      { label: "متوقع تکمیل", value: "اگست 2027", valueColor: "#0F5132" },
    ],
  },
  {
    name: "لیپ ٹاپ",
    pct: 35,
    current: "41,500",
    target: "120,000",
    barColor: "#D8A72A",
    badgeBg: "#FDF3D8",
    badgeFg: "#6B5B2E",
    details: [
      { label: "ہدف کی تاریخ", value: "دسمبر 2026" },
      { label: "درکار ماہانہ", value: "Rs. 19,600" },
      { label: "موجودہ رفتار پر", value: "مارچ 2027", valueColor: "#B3261E" },
    ],
  },
];

export default function GoalsPage() {
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">بچت کے اہداف</h1>
          <p className="text-[14px] text-[#6B7A70]">
            3 فعال ہدف · کل جمع Rs. 265,500
          </p>
        </div>
        <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
          + نیا ہدف
        </button>
      </header>

      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {/* Goal cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <div
              key={g.name}
              className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-6"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-[19px] font-bold">{g.name}</h3>
                <span
                  className="rounded-full px-2.5 py-1 font-[var(--font-manrope)] text-[12px]"
                  style={{ background: g.badgeBg, color: g.badgeFg }}
                >
                  {g.pct}%
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-3 overflow-hidden rounded-full bg-[#EDEAE0]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, background: g.barColor }}
                  />
                </div>
                <div className="flex justify-between font-[var(--font-manrope)] text-[13px] text-[#4C5A52]">
                  <span>Rs. {g.current}</span>
                  <span>Rs. {g.target}</span>
                </div>
              </div>
              <div className="flex flex-col gap-[7px] text-[14px] text-[#4C5A52]">
                {g.details.map((d) => (
                  <div key={d.label} className="flex justify-between">
                    <span className="text-[#6B7A70]">{d.label}</span>
                    <span
                      style={d.valueColor ? { color: d.valueColor } : undefined}
                    >
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
              <button className="rounded-[9px] border-0 bg-[#F1EEE4] py-[11px] text-[14px]">
                رقم جمع کریں
              </button>
            </div>
          ))}
        </div>

        {/* What-if scenario */}
        <div className="grid grid-cols-1 items-center gap-[26px] rounded-2xl border border-[#E7E2D6] bg-white p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-2.5">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#0F5132]">
              WHAT-IF · معاون کا حساب
            </span>
            <h3 className="text-[20px] font-bold leading-[1.85]">
              اگر کھانے کا خرچ 15٪ کم کریں تو لیپ ٹاپ کب مکمل ہو گا؟
            </h3>
            <p className="text-[15px] leading-[2.05] text-[#4C5A52]">
              15٪ کمی سے ہر مہینے Rs. 4,260 بچیں گے۔ اسے لیپ ٹاپ کے ہدف میں شامل
              کرنے پر ماہانہ رفتار Rs. 13,100 سے Rs. 17,360 ہو جائے گی — تکمیل
              مارچ 2027 سے جنوری 2027 پر آ جائے گی۔
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-[14px] border border-[#E7E2D6] bg-[#FBF9F4] p-5">
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6B7A70]">ماہانہ اضافی بچت</span>
              <span className="font-[var(--font-manrope)] font-bold">
                Rs. 4,260
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6B7A70]">پہلے</span>
              <span className="font-[var(--font-manrope)]">مارچ 2027</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[#6B7A70]">بعد</span>
              <span className="font-[var(--font-manrope)] font-bold text-[#0F5132]">
                جنوری 2027
              </span>
            </div>
            <span className="text-[12px] leading-[1.9] text-[#8A9690]">
              حساب مئی–اگست کے حقیقی لین دین سے۔ اندازہ ± 5٪۔
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
