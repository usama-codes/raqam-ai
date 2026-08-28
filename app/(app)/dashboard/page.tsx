// MOCK_DATA — replace in Phase 2
import Link from "next/link";

/* ── Hard-coded design data (matches Raqam-AI.dc.html dashboard) ── */

const categorySpending = [
  { name: "کرایہ", amount: 45000, pct: 100, color: "#0F5132" },
  { name: "کھانا و گروسری", amount: 28400, pct: 63, color: "#1B6B45" },
  { name: "تعلیم", amount: 15000, pct: 33, color: "#2E8459" },
  { name: "بجلی و گیس", amount: 14200, pct: 31, color: "#4E9C74" },
  { name: "آمدورفت", amount: 12600, pct: 28, color: "#6FB48F" },
  { name: "صحت", amount: 6900, pct: 15, color: "#8FC7A9" },
  { name: "موبائل و انٹرنیٹ", amount: 4800, pct: 11, color: "#A9D5BF" },
];

const recentTransactions = [
  {
    icon: "⛽",
    label: "پیٹرول",
    meta: "آمدورفت · آج · آواز سے",
    amount: 850,
    type: "expense" as const,
  },
  {
    icon: "🛒",
    label: "کریانہ — الفتح اسٹور",
    meta: "کھانا و گروسری · آج · رسید سے",
    amount: 3240,
    type: "expense" as const,
  },
  {
    icon: "💼",
    label: "فری لانس ادائیگی",
    meta: "آمدنی · کل · دستی",
    amount: 20000,
    type: "income" as const,
  },
  {
    icon: "🛺",
    label: "رکشہ کرایہ",
    meta: "آمدورفت · کل · معاون سے",
    amount: 300,
    type: "expense" as const,
  },
  {
    icon: "💡",
    label: "بجلی کا بل",
    meta: "بجلی و گیس · 24 اگست · درآمد",
    amount: 8400,
    type: "expense" as const,
  },
];

const budgetUtilization = [
  {
    name: "کرایہ",
    pct: 100,
    spent: "45,000",
    limit: "45,000",
    color: "#B3261E",
  },
  {
    name: "موبائل و انٹرنیٹ",
    pct: 96,
    spent: "4,800",
    limit: "5,000",
    color: "#B3261E",
  },
  {
    name: "بجلی و گیس",
    pct: 89,
    spent: "14,200",
    limit: "16,000",
    color: "#C4622D",
  },
  {
    name: "کھانا و گروسری",
    pct: 84,
    spent: "28,400",
    limit: "34,000",
    color: "#C4622D",
  },
  {
    name: "تعلیم",
    pct: 75,
    spent: "15,000",
    limit: "20,000",
    color: "#D8A72A",
  },
  { name: "صحت", pct: 58, spent: "6,900", limit: "12,000", color: "#22B07D" },
];

const savingsGoals = [
  { name: "عمرہ فنڈ", current: "128,000", target: "350,000", pct: 37 },
  { name: "ایمرجنسی فنڈ", current: "96,000", target: "200,000", pct: 48 },
  { name: "لیپ ٹاپ", current: "41,500", target: "120,000", pct: 35 },
];

const upcomingBills = [
  { label: "انٹرنیٹ بل · 2 دن میں", amount: "2,600" },
  { label: "بجلی کا بل · 5 دن میں", amount: "8,400" },
  { label: "اسکول فیس · 6 دن میں", amount: "15,000" },
];

function pkr(n: string | number) {
  return `Rs. ${typeof n === "number" ? n.toLocaleString() : n}`;
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-[5] flex items-center justify-between gap-5 border-b border-[#E7E2D6] bg-white px-6 py-[26px] sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-[1.7]">
            خوش آمدید، زینب
          </h1>
          <p className="text-[14px] text-[#6B7A70]">
            اگست 2026 · تمام اعداد آپ کے 41 محفوظ شدہ لین دین سے
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden overflow-hidden rounded-[10px] border border-[#E7E2D6] sm:flex">
            <span className="bg-[#F1EEE4] px-3.5 py-[9px] text-[14px]">
              اگست 2026
            </span>
            <span className="border-r border-[#E7E2D6] px-3 py-[9px] text-[14px] text-[#6B7A70]">
              ▾
            </span>
          </div>
          <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-[11px] text-[14px] text-white hover:bg-[#14231B]">
            + نیا لین دین
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex flex-col gap-[22px] px-6 pb-12 pt-7 sm:px-10">
        {/* Budget alert banner */}
        <div className="flex flex-wrap items-start gap-3.5 rounded-[14px] border border-[#E8CE86] bg-[#FDF3D8] p-4 px-5">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[#E8B931] text-[#0B3B26] font-bold">
            !
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-[15px] font-semibold">
              کھانا و گروسری کا بجٹ 84٪ استعمال ہو چکا ہے
            </span>
            <span className="text-[14px] leading-[1.9] text-[#6B5B2E]">
              {pkr("28,400")} از {pkr("34,000")} — مہینے میں 4 دن باقی ہیں۔ اسی
              رفتار پر {pkr("2,100")} اوپر جانے کا امکان ہے۔
            </span>
          </div>
          <button className="whitespace-nowrap rounded-[9px] border-0 bg-[#0F5132] px-3.5 py-[9px] text-[13px] text-white">
            معاون سے پوچھیں
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl bg-[#0F5132] p-5 text-[#EAF1EB]">
            <span className="text-[13px] text-[#B9CFC1]">اس مہینے کی بچت</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr("52,600")}
            </span>
            <span className="text-[13px] text-[#E8B931]">
              پچھلے مہینے سے {pkr("4,900")} زیادہ
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">کل آمدنی</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr("185,000")}
            </span>
            <span className="text-[13px] text-[#6B7A70]">
              تنخواہ 165,000 · فری لانس 20,000
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">کل اخراجات</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              {pkr("132,400")}
            </span>
            <span className="text-[13px] text-[#B3261E]">
              مہینے کے اختتام کا اندازہ: 141,800 ± 5٪
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[#E7E2D6] bg-white p-5">
            <span className="text-[13px] text-[#6B7A70]">بچت کی شرح</span>
            <span className="font-[var(--font-manrope)] text-[clamp(20px,2.1vw,30px)] font-extrabold tracking-[-.02em] whitespace-nowrap">
              28.4%
            </span>
            <div className="h-[6px] overflow-hidden rounded-full bg-[#EDEAE0]">
              <div
                className="h-full rounded-full bg-[#22B07D]"
                style={{ width: "28.4%" }}
              />
            </div>
          </div>
        </div>

        {/* Category spending + Trend + Bills */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Category spending */}
          <div className="flex flex-col gap-[18px] rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold">زمرے کے حساب سے خرچ</h2>
              <span className="font-[var(--font-manrope)] text-[12px] text-[#6B7A70]">
                AUG 2026 · {pkr("132,400")}
              </span>
            </div>
            <div className="flex flex-col gap-3.5">
              {categorySpending.map((cat) => (
                <div key={cat.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[14px]">
                    <span>{cat.name}</span>
                    <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                      {pkr(cat.amount)}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#EDEAE0]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cat.pct}%`, background: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend + Bills */}
          <div className="flex flex-col gap-4">
            {/* 6-month trend */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h2 className="text-[18px] font-bold">چھ مہینوں کا رجحان</h2>
              <div dir="ltr">
                <svg viewBox="0 0 320 130" className="h-[130px] w-full">
                  <defs>
                    <linearGradient id="rqTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0F5132" stopOpacity=".22" />
                      <stop offset="100%" stopColor="#0F5132" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="100" x2="320" y2="100" stroke="#EDEAE0" />
                  <line x1="0" y1="66" x2="320" y2="66" stroke="#EDEAE0" />
                  <line x1="0" y1="32" x2="320" y2="32" stroke="#EDEAE0" />
                  <path
                    d="M8 62 L70 78 L132 68 L194 100 L256 76 L310 84 L310 118 L8 118 Z"
                    fill="url(#rqTrend)"
                  />
                  <polyline
                    points="8,62 70,78 132,68 194,100 256,76 310,84"
                    fill="none"
                    stroke="#0F5132"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="310"
                    cy="84"
                    r="5"
                    fill="#E8B931"
                    stroke="#0F5132"
                    strokeWidth="2"
                  />
                  <g
                    fontFamily="Manrope, sans-serif"
                    fontSize="9"
                    fill="#8A9690"
                  >
                    <text x="2" y="126">
                      Mar
                    </text>
                    <text x="62" y="126">
                      Apr
                    </text>
                    <text x="124" y="126">
                      May
                    </text>
                    <text x="186" y="126">
                      Jun
                    </text>
                    <text x="248" y="126">
                      Jul
                    </text>
                    <text x="298" y="126">
                      Aug
                    </text>
                  </g>
                </svg>
              </div>
              <p className="text-[13px] leading-[1.9] text-[#6B7A70]">
                جون میں سب سے زیادہ {pkr("139,800")} — عید کے اخراجات۔ چھ ماہ کا
                اوسط {pkr("126,250")}۔
              </p>
            </div>

            {/* Upcoming bills */}
            <div className="flex flex-col gap-3.5 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h2 className="text-[18px] font-bold">اگلے 7 دن میں متوقع بل</h2>
              {upcomingBills.map((bill, i) => (
                <div
                  key={bill.label}
                  className={`flex justify-between text-[14px] ${i < upcomingBills.length - 1 ? "border-b border-[#F1EEE4] pb-2.5" : ""}`}
                >
                  <span>{bill.label}</span>
                  <span className="font-[var(--font-manrope)] font-semibold">
                    {pkr(bill.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent transactions + Budget util + Goals */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent transactions */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-bold">حالیہ لین دین</h2>
              <Link
                href="/transactions"
                className="text-[14px] text-[#0F5132] hover:underline"
              >
                سب دیکھیں →
              </Link>
            </div>
            <div className="flex flex-col gap-0.5">
              {recentTransactions.map((tx, i) => (
                <div
                  key={tx.label}
                  className={`flex items-center gap-3.5 py-[11px] ${i < recentTransactions.length - 1 ? "border-b border-[#F4F1E8]" : ""}`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#E6EFE9] text-[15px]">
                    {tx.icon}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px]">{tx.label}</span>
                    <span className="text-[12px] text-[#8A9690]">
                      {tx.meta}
                    </span>
                  </div>
                  <span
                    className={`font-[var(--font-manrope)] text-[15px] font-semibold ${tx.type === "income" ? "text-[#0F5132]" : ""}`}
                  >
                    {tx.type === "income" ? "+" : "−"} {pkr(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Budget utilization + Savings goals */}
          <div className="flex flex-col gap-4">
            {/* Budget utilization */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold">بجٹ کا استعمال</h2>
                <Link
                  href="/budgets"
                  className="text-[14px] text-[#0F5132] hover:underline"
                >
                  تفصیل →
                </Link>
              </div>
              <div className="flex flex-col gap-[13px]">
                {budgetUtilization.map((b) => (
                  <div key={b.name} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[14px]">
                      <span>{b.name}</span>
                      <span
                        className="font-[var(--font-manrope)]"
                        style={{ color: b.color }}
                      >
                        {b.pct}% · {b.spent} / {b.limit}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(b.pct, 100)}%`,
                          background: b.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Savings goals */}
            <div className="flex flex-col gap-4 rounded-2xl border border-[#E7E2D6] bg-white p-[22px]">
              <h2 className="text-[18px] font-bold">بچت کے اہداف</h2>
              {savingsGoals.map((g) => (
                <div key={g.name} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[14px]">
                    <span>{g.name}</span>
                    <span className="font-[var(--font-manrope)] text-[#4C5A52]">
                      {g.current} / {g.target}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EDEAE0]">
                    <div
                      className="h-full rounded-full bg-[#0F5132]"
                      style={{ width: `${g.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
