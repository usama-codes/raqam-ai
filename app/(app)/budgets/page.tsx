/* ── Budgets page — pixel-accurate replication ── */

const budgetRows = [
  {
    name: "کرایہ",
    limit: "45,000",
    pct: 100,
    spent: "45,000",
    remaining: "0",
    remColor: "#B3261E",
    barColor: "#B3261E",
  },
  {
    name: "کھانا و گروسری",
    limit: "34,000",
    pct: 84,
    spent: "28,400",
    remaining: "5,600",
    remColor: "",
    barColor: "#C4622D",
  },
  {
    name: "تعلیم",
    limit: "20,000",
    pct: 75,
    spent: "15,000",
    remaining: "5,000",
    remColor: "",
    barColor: "#D8A72A",
  },
  {
    name: "بجلی و گیس",
    limit: "16,000",
    pct: 89,
    spent: "14,200",
    remaining: "1,800",
    remColor: "",
    barColor: "#C4622D",
  },
  {
    name: "آمدورفت",
    limit: "18,000",
    pct: 70,
    spent: "12,600",
    remaining: "5,400",
    remColor: "",
    barColor: "#D8A72A",
  },
  {
    name: "صحت",
    limit: "12,000",
    pct: 58,
    spent: "6,900",
    remaining: "5,100",
    remColor: "",
    barColor: "#22B07D",
  },
  {
    name: "موبائل و انٹرنیٹ",
    limit: "5,000",
    pct: 96,
    spent: "4,800",
    remaining: "200",
    remColor: "",
    barColor: "#B3261E",
  },
];

const tblGrid = "grid-cols-[minmax(140px,1.3fr)_130px_minmax(120px,1fr)_100px]";

export default function BudgetsPage() {
  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">ماہانہ بجٹ</h1>
          <p className="text-[14px] text-[#6B7A70]">
            اگست 2026 · کل حد Rs. 160,000 · خرچ Rs. 132,400
          </p>
        </div>
        <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
          زمرہ شامل کریں
        </button>
      </header>

      <div className="grid grid-cols-1 items-start gap-[18px] px-6 pb-12 pt-6 sm:px-10 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-[18px]">
          {/* Overall utilization */}
          <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-6">
            <div className="flex items-end justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-[14px] text-[#6B7A70]">
                  مجموعی استعمال
                </span>
                <span className="font-[var(--font-manrope)] text-[32px] font-extrabold">
                  83%
                </span>
              </div>
              <span className="text-[14px] text-[#6B7A70]">
                Rs. 27,600 باقی · 4 دن
              </span>
            </div>
            <div className="h-[14px] overflow-hidden rounded-full bg-[#EDEAE0]">
              <div
                className="h-full rounded-full"
                style={{
                  width: "83%",
                  background: "linear-gradient(90deg,#0F5132,#C4622D)",
                }}
              />
            </div>
            <div className="flex flex-wrap gap-[18px] text-[13px] text-[#6B7A70]">
              {[
                { c: "#22B07D", l: "0–59٪ محفوظ" },
                { c: "#D8A72A", l: "60–79٪ خیال رکھیں" },
                { c: "#C4622D", l: "80–99٪ انتباہ" },
                { c: "#B3261E", l: "100٪+ حد سے باہر" },
              ].map((leg) => (
                <span key={leg.l} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-[3px]"
                    style={{ background: leg.c }}
                  />
                  {leg.l}
                </span>
              ))}
            </div>
          </div>

          {/* Category table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
            <div
              className={`hidden min-w-[640px] ${tblGrid} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
            >
              <span>زمرہ</span>
              <span>ماہانہ حد</span>
              <span>استعمال</span>
              <span>باقی</span>
            </div>
            {budgetRows.map((row, i) => (
              <div
                key={row.name}
                className={`hidden min-w-[640px] ${tblGrid} grid items-center gap-3.5 px-5 py-4 md:grid ${i < budgetRows.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
              >
                <span className="text-[15px]">{row.name}</span>
                <input
                  defaultValue={row.limit}
                  className="w-full rounded-[9px] border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-[9px] font-[var(--font-manrope)] text-[14px]"
                  readOnly
                />
                <div className="flex flex-col gap-1.5">
                  <span
                    className="font-[var(--font-manrope)] text-[12px]"
                    style={{ color: row.barColor }}
                  >
                    {row.pct}% · {row.spent}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(row.pct, 100)}%`,
                        background: row.barColor,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`font-[var(--font-manrope)] text-[14px] ${row.remColor ? `text-[${row.remColor}]` : ""}`}
                  style={row.remColor ? { color: row.remColor } : undefined}
                >
                  Rs. {row.remaining}
                </span>
              </div>
            ))}
            {/* Mobile cards for budget rows */}
            <div className="flex flex-col md:hidden">
              {budgetRows.map((row, i) => (
                <div
                  key={`m-${row.name}`}
                  className={`px-4 py-3 ${i < budgetRows.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                >
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="font-medium">{row.name}</span>
                    <span
                      className="font-[var(--font-manrope)] text-[12px]"
                      style={{ color: row.barColor }}
                    >
                      {row.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(row.pct, 100)}%`,
                        background: row.barColor,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[12px] text-[#6B7A70]">
                    <span>حد: Rs. {row.limit}</span>
                    <span>باقی: Rs. {row.remaining}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          {/* AI Recommendation */}
          <div className="flex flex-col gap-3.5 rounded-2xl bg-[#0F5132] p-[22px] text-[#EAF1EB]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#E8B931]">
              AI RECOMMENDATION
            </span>
            <h2 className="text-[19px] font-bold leading-[1.85]">
              کھانے کا بجٹ Rs. 30,000 رکھنے کی تجویز
            </h2>
            <p className="text-[15px] leading-[2.05] text-[#CBDDD1]">
              آپ کے پچھلے تین مہینوں کا اوسط کھانے کا خرچ Rs. 31,700 رہا ہے، جس
              میں باہر کے کھانے کا حصہ Rs. 6,900 ہے۔ Rs. 30,000 کی حد ہر مہینے
              تقریباً Rs. 4,000 بچائے گی اور عمرہ فنڈ دو مہینے پہلے مکمل ہو گا۔
            </p>
            <div className="rounded-[10px] bg-white/[.08] px-3.5 py-3 text-[13px] leading-[1.9] text-[#B9CFC1]">
              حساب آپ کے مئی–جولائی کے 96 لین دین سے کیا گیا ہے۔ یہ اندازہ ہے،
              ضمانت نہیں۔
            </div>
            <div className="flex gap-2.5">
              <button className="rounded-[10px] border-0 bg-[#E8B931] px-[18px] py-3 text-[14px] font-bold text-[#0B3B26] hover:bg-[#F2C846]">
                تجویز لاگو کریں
              </button>
              <button className="rounded-[10px] border border-white/[.28] bg-transparent px-[18px] py-3 text-[14px] text-[#EAF1EB]">
                بعد میں
              </button>
            </div>
          </div>

          {/* Anomaly detection */}
          <div className="flex flex-col gap-2.5 rounded-2xl border border-[#E8CE86] bg-white p-[22px]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#C4622D]">
              ANOMALY · 3 ماہ کے اوسط سے 38٪ زیادہ
            </span>
            <h3 className="text-[18px] font-bold leading-[1.85]">
              بجلی و گیس کا خرچ غیر معمولی ہے
            </h3>
            <p className="text-[14px] leading-[2] text-[#4C5A52]">
              اگست میں Rs. 14,200 — مئی سے جولائی کا اوسط Rs. 10,300 تھا۔ گرمی
              کے مہینوں میں یہ عام ہے، مگر اگلے مہینے کی حد بڑھانا مناسب ہو سکتا
              ہے۔
            </p>
            <button className="self-start rounded-[9px] border-0 bg-[#F1EEE4] px-4 py-2.5 text-[14px]">
              حد Rs. 18,000 کر دیں
            </button>
          </div>

          {/* Budget vs actual */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
            <h3 className="text-[18px] font-bold">بجٹ بمقابلہ حقیقت</h3>
            <div className="flex flex-col gap-2.5 text-[14px]">
              <div className="flex justify-between">
                <span className="text-[#6B7A70]">جولائی — حد</span>
                <span className="font-[var(--font-manrope)]">Rs. 155,000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7A70]">جولائی — خرچ</span>
                <span className="font-[var(--font-manrope)] text-[#1B6B45]">
                  Rs. 128,700
                </span>
              </div>
              <div className="flex justify-between border-t border-[#F1EEE4] pt-2.5">
                <span>بچت</span>
                <span className="font-[var(--font-manrope)] font-bold text-[#0F5132]">
                  Rs. 26,300
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
