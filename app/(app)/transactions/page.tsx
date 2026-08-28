import Link from "next/link";

/* ── Hard-coded table rows (matches Raqam-AI.dc.html transactions screen) ── */
const tableRows = [
  {
    date: "آج",
    desc: "پیٹرول",
    cat: "آمدورفت",
    source: "آواز",
    srcBg: "#EDF1FA",
    srcFg: "#31518F",
    amount: "850",
    type: "expense" as const,
  },
  {
    date: "آج",
    desc: "کریانہ — الفتح اسٹور",
    cat: "کھانا و گروسری",
    source: "رسید",
    srcBg: "#F5EDF9",
    srcFg: "#6B3990",
    amount: "3,240",
    type: "expense" as const,
  },
  {
    date: "کل",
    desc: "فری لانس ادائیگی",
    cat: "آمدنی",
    source: "دستی",
    srcBg: "#F1EEE4",
    srcFg: "#6B7A70",
    amount: "20,000",
    type: "income" as const,
  },
  {
    date: "کل",
    desc: "رکشہ کرایہ",
    cat: "آمدورفت",
    source: "معاون",
    srcBg: "#E6EFE9",
    srcFg: "#0F5132",
    amount: "300",
    type: "expense" as const,
  },
  {
    date: "24 اگست",
    desc: "بجلی کا بل",
    cat: "بجلی و گیس",
    source: "درآمد",
    srcBg: "#FDF3D8",
    srcFg: "#6B5B2E",
    amount: "8,400",
    type: "expense" as const,
  },
  {
    date: "22 اگست",
    desc: "اسکول فیس — عمر",
    cat: "تعلیم",
    source: "دستی",
    srcBg: "#F1EEE4",
    srcFg: "#6B7A70",
    amount: "15,000",
    type: "expense" as const,
  },
  {
    date: "20 اگست",
    desc: "گھر کا کرایہ",
    cat: "کرایہ",
    source: "دستی",
    srcBg: "#F1EEE4",
    srcFg: "#6B7A70",
    amount: "45,000",
    type: "expense" as const,
  },
];

const gridCols =
  "grid-cols-[100px_minmax(150px,1.6fr)_minmax(120px,1fr)_110px_120px_90px]";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">لین دین</h1>
          <p className="text-[14px] text-[#6B7A70]">
            41 اندراج · اگست 2026 · نئے پہلے
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            href="/import"
            className="hidden rounded-[10px] border border-[#DCD6C8] bg-white px-4 py-[11px] text-[14px] hover:bg-[#FBF9F4] sm:block"
          >
            اسٹیٹمنٹ درآمد
          </Link>
          <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
            + نیا لین دین
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex flex-col gap-[18px] px-6 pb-12 pt-6 sm:px-10">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#E7E2D6] bg-white p-4 px-[18px]">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5">
            <span className="text-[#8A9690]">⌕</span>
            <span className="text-[14px] text-[#9BA79F]">
              تفصیل میں تلاش کریں…
            </span>
          </div>
          <div className="flex overflow-hidden rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4]">
            <span className="bg-[#0F5132] px-3.5 py-2.5 text-[14px] text-white">
              سب
            </span>
            <span className="border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px]">
              خرچ
            </span>
            <span className="border-r border-[#DCD6C8] px-3.5 py-2.5 text-[14px]">
              آمدنی
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px]">
            <span>1–31 اگست</span>
            <span className="text-[#8A9690]">▾</span>
          </div>
          <div className="hidden items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] md:flex">
            <span>زمرہ: 3 منتخب</span>
            <span className="text-[#8A9690]">▾</span>
          </div>
          <div className="hidden items-center gap-2 rounded-[10px] border border-[#DCD6C8] bg-[#FBF9F4] px-3.5 py-2.5 text-[14px] md:flex">
            <span>ذریعہ: سب</span>
            <span className="text-[#8A9690]">▾</span>
          </div>
          <button className="text-[14px] text-[#0F5132]">فلٹر ہٹائیں</button>
        </div>

        {/* Data table */}
        <div className="overflow-x-auto rounded-2xl border border-[#E7E2D6] bg-white">
          {/* Table header */}
          <div
            className={`hidden min-w-[800px] ${gridCols} grid gap-3.5 border-b border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5 font-[var(--font-manrope)] text-[11px] tracking-[.12em] text-[#8A9690] md:grid`}
          >
            <span>تاریخ</span>
            <span>تفصیل</span>
            <span>زمرہ</span>
            <span>ذریعہ</span>
            <span>رقم</span>
            <span></span>
          </div>
          {/* Table rows */}
          {tableRows.map((row, i) => (
            <div
              key={`${row.desc}-${i}`}
              className={`min-w-[800px] ${gridCols} hidden grid items-center gap-3.5 px-5 py-[15px] text-[15px] hover:bg-[#FBF9F4] md:grid ${i < tableRows.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
            >
              <span className="text-[14px] text-[#6B7A70]">{row.date}</span>
              <span>{row.desc}</span>
              <span className="text-[#4C5A52]">{row.cat}</span>
              <span
                className="justify-self-start rounded-full px-2.5 py-1 text-[12px]"
                style={{ background: row.srcBg, color: row.srcFg }}
              >
                {row.source}
              </span>
              <span
                className={`font-[var(--font-manrope)] font-semibold ${row.type === "income" ? "text-[#0F5132]" : ""}`}
              >
                {row.type === "income" ? "+" : "−"} Rs. {row.amount}
              </span>
              <span className="flex gap-3 text-[14px]">
                <button className="text-[#0F5132]">تبدیلی</button>
                <button className="text-[#B3261E]">حذف</button>
              </span>
            </div>
          ))}
          {/* Mobile card layout */}
          <div className="flex flex-col md:hidden">
            {tableRows.map((row, i) => (
              <div
                key={`m-${row.desc}-${i}`}
                className={`flex items-center gap-3.5 px-4 py-3 ${i < tableRows.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium">{row.desc}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ background: row.srcBg, color: row.srcFg }}
                    >
                      {row.source}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#8A9690]">
                    {row.date} · {row.cat}
                  </span>
                </div>
                <span
                  className={`font-[var(--font-manrope)] text-[15px] font-semibold ${row.type === "income" ? "text-[#0F5132]" : ""}`}
                >
                  {row.type === "income" ? "+" : "−"} Rs. {row.amount}
                </span>
              </div>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex min-w-[800px] items-center justify-between border-t border-[#E7E2D6] bg-[#FBF9F4] px-5 py-3.5">
            <span className="text-[14px] text-[#6B7A70]">1–20 از 41</span>
            <div className="flex gap-2">
              <span className="rounded-[8px] border border-[#DCD6C8] bg-[#0F5132] px-3 py-[7px] font-[var(--font-manrope)] text-[13px] text-white">
                1
              </span>
              <span className="rounded-[8px] border border-[#DCD6C8] px-3 py-[7px] font-[var(--font-manrope)] text-[13px]">
                2
              </span>
              <span className="rounded-[8px] border border-[#DCD6C8] px-3 py-[7px] font-[var(--font-manrope)] text-[13px]">
                3
              </span>
              <span className="rounded-[8px] border border-[#DCD6C8] px-3 py-[7px] text-[13px]">
                اگلا →
              </span>
            </div>
          </div>
        </div>

        {/* Empty state + Duplicate guard */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-dashed border-[#CBD9CF] bg-white p-[26px]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
              EMPTY STATE
            </span>
            <h3 className="text-[18px] font-bold">
              اس فلٹر پر کوئی لین دین نہیں ملا
            </h3>
            <p className="text-[14px] leading-[2] text-[#6B7A70]">
              تاریخ یا زمرہ تبدیل کریں، یا معاون سے کہیں: &quot;جولائی کے سفر کے
              اخراجات دکھاؤ&quot;۔
            </p>
            <button className="rounded-[9px] border-0 bg-[#F1EEE4] px-4 py-2.5 text-[14px]">
              فلٹر صاف کریں
            </button>
          </div>
          <div className="flex flex-col items-start gap-2.5 rounded-2xl border border-[#E7E2D6] bg-white p-[26px]">
            <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#B3261E]">
              DUPLICATE GUARD
            </span>
            <h3 className="text-[18px] font-bold">ممکنہ دہرا اندراج</h3>
            <p className="text-[14px] leading-[2] text-[#6B7A70]">
              آج ہی Rs. 850 پیٹرول کا اندراج موجود ہے۔ کیا یہ الگ خرچ ہے؟
            </p>
            <div className="flex gap-2">
              <button className="rounded-[9px] border-0 bg-[#0F5132] px-4 py-2.5 text-[14px] text-white">
                جی، الگ ہے
              </button>
              <button className="rounded-[9px] border-0 bg-[#F1EEE4] px-4 py-2.5 text-[14px]">
                چھوڑ دیں
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
