"use client";

import * as React from "react";
import Link from "next/link";
import { LandingChatDemo } from "./LandingChatDemo";

type Lang = "ur" | "en";

// ─── Copy (both languages authored inline — the landing page is outside the
//     app's i18n system on purpose: no LanguageProvider, no Convex) ────────────
const COPY = {
  ur: {
    signIn: "لاگ اِن",
    getStarted: "شروع کریں",
    heroTitle: "اپنے پیسوں کو سمجھیں — اپنی زبان میں",
    heroSub:
      "رقم ایک اردو بولنے والا مالی معاون ہے جو آپ کے اصل لین دین کو دیکھتا ہے، اردو میں سمجھاتا ہے، اور آپ کی اجازت سے چند مفید کام کرتا ہے۔",
    heroCta: "مفت شروع کریں",
    heroNote: "کریڈٹ کارڈ کی ضرورت نہیں۔",
    problemKicker: "مسئلہ",
    problemTitle: "مالیات کی زبان سب کے لیے نہیں بنی",
    problemBody:
      "پاکستان میں لاکھوں لوگ اردو میں سوچتے اور بات کرتے ہیں، مگر بجٹنگ ایپس، بینک اسٹیٹمنٹس اور مالی مشورے انگریزی اور پیچیدہ اصطلاحات میں ہوتے ہیں۔ رقم اِس خلا کو پُر کرتا ہے۔",
    demoKicker: "کیسے کام کرتا ہے",
    demoTitle: "بات کریں، رقم آپ کے ڈیٹا سے جواب دیتا ہے",
    demoBody:
      "ہر جواب آپ کے اپنے لین دین سے نکلتا ہے — کوئی من گھڑت اعداد نہیں۔ کوئی بھی تبدیلی آپ کی تصدیق کے بغیر نہیں ہوتی۔",
    featuresKicker: "خصوصیات",
    featuresTitle: "ایک جگہ، آپ کی پوری مالی تصویر",
    features: [
      ["📊", "خرچ ٹریک کریں", "ہاتھ سے، بول کر، یا رسید کی تصویر سے لین دین شامل کریں۔"],
      ["🎯", "بجٹ اور اہداف", "ماہانہ حدیں مقرر کریں اور بچت کے اہداف کی پیش رفت دیکھیں۔"],
      ["🧠", "ذہین تجزیہ", "مہینے کے آخر کا تخمینہ، غیر معمولی خرچ، اور 'کیا میں یہ خرید سکتا ہوں؟'"],
      ["🎙", "اردو آواز", "بول کر خرچ لکھوائیں — رقم اردو تقریر سمجھتا ہے۔"],
      ["🧾", "رسید پڑھنا", "رسید کی تصویر لیں، رقم دکان، رقم اور زمرہ نکال لیتا ہے۔"],
      ["📥", "بینک اسٹیٹمنٹ", "CSV اسٹیٹمنٹ درآمد کریں — نقلیں خود پکڑی جاتی ہیں۔"],
    ],
    safetyKicker: "حفاظت",
    safetyTitle: "آپ کے کنٹرول میں",
    safety: [
      ["تصدیق ضروری", "رقم کوئی خرچ یا ہدف بنانے سے پہلے آپ کو تجویز دکھاتا ہے — آپ 'تصدیق' یا 'منسوخ' دباتے ہیں۔"],
      ["اصل ڈیٹا پر مبنی", "ہر مالی دعویٰ آپ کے محفوظ شدہ لین دین سے آتا ہے۔ ڈیٹا نہ ہو تو رقم صاف کہہ دیتا ہے۔"],
      ["محدود اختیار", "رقم پیسے منتقل نہیں کر سکتا، ادائیگیاں نہیں کر سکتا — صرف چند طے شدہ کام۔"],
    ],
    footerTitle: "آج ہی اپنی مالی تصویر واضح کریں",
    footerCta: "مفت اکاؤنٹ بنائیں",
    footerLangNote: "English",
  },
  en: {
    signIn: "Sign in",
    getStarted: "Get started",
    heroTitle: "Understand your money — in the language you think in",
    heroSub:
      "Raqam is an Urdu-speaking financial assistant that reads your real transactions, explains them in Urdu, and — with your permission — performs a small set of useful actions.",
    heroCta: "Start free",
    heroNote: "No credit card needed.",
    problemKicker: "The problem",
    problemTitle: "The language of finance wasn't built for everyone",
    problemBody:
      "Millions of Pakistanis think and speak in Urdu, yet budgeting apps, bank statements and financial advice arrive in English and dense jargon. Raqam closes that gap.",
    demoKicker: "How it works",
    demoTitle: "Just talk — Raqam answers from your data",
    demoBody:
      "Every answer is derived from your own transactions — no invented figures. Nothing changes without your confirmation.",
    featuresKicker: "Features",
    featuresTitle: "One place for your whole financial picture",
    features: [
      ["📊", "Track spending", "Add transactions by hand, by voice, or from a photo of a receipt."],
      ["🎯", "Budgets & goals", "Set monthly limits and watch your savings goals fill up."],
      ["🧠", "Smart analysis", "End-of-month projections, unusual spending, and 'can I afford this?'"],
      ["🎙", "Urdu voice", "Dictate an expense out loud — Raqam understands Urdu speech."],
      ["🧾", "Receipt reading", "Snap a receipt; Raqam extracts the merchant, amount and category."],
      ["📥", "Bank statements", "Import a CSV statement — duplicates are caught automatically."],
    ],
    safetyKicker: "Safety",
    safetyTitle: "You stay in control",
    safety: [
      ["Confirmation required", "Raqam shows you a proposed action before creating anything — you press Confirm or Cancel."],
      ["Grounded in real data", "Every financial claim comes from your saved transactions. If the data isn't there, Raqam says so."],
      ["Bounded authority", "Raqam can't move money or make payments — only a small, fixed set of actions."],
    ],
    footerTitle: "Bring your finances into focus today",
    footerCta: "Create a free account",
    footerLangNote: "اردو",
  },
} as const;

export function Landing() {
  const [lang, setLang] = React.useState<Lang>("ur");
  const c = COPY[lang];
  const dir = lang === "ur" ? "rtl" : "ltr";
  const headingFont =
    lang === "ur"
      ? "var(--font-noto-nastaliq-urdu)"
      : "var(--font-manrope), system-ui, sans-serif";

  // Keep the document in sync so scrollbar side / text direction match.
  React.useEffect(() => {
    const html = document.documentElement;
    const prevDir = html.dir;
    const prevLang = html.lang;
    html.dir = dir;
    html.lang = lang;
    return () => {
      html.dir = prevDir || "rtl";
      html.lang = prevLang || "ur";
    };
  }, [dir, lang]);

  return (
    <div dir={dir} className="min-h-screen bg-[#F7F4EC] text-[#14231B]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-[#E7E2D6] bg-[#F7F4EC]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#E8B931] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[18px] font-bold text-[#0B3B26]">
              ر
            </span>
            <span className="font-[var(--font-manrope)] text-[13px] font-bold tracking-[.2em] text-[#14231B]">
              RAQAM&nbsp;AI
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setLang(lang === "ur" ? "en" : "ur")}
              className="rounded-full border border-[#DCD6C8] px-3 py-1.5 text-[12px] font-medium text-[#4C5A52] transition-colors hover:border-[#0F5132] hover:text-[#0F5132]"
            >
              {c.footerLangNote}
            </button>
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#4C5A52] hover:text-[#0F5132]"
            >
              {c.signIn}
            </Link>
            <Link
              href="/signup"
              className="rounded-[10px] bg-[#0F5132] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#14231B]"
            >
              {c.getStarted}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1120px] px-5 pb-16 pt-16 sm:pt-24">
        <div className="lp-reveal max-w-[720px]">
          <h1
            className="text-[34px] font-bold leading-[1.35] sm:text-[52px] sm:leading-[1.3]"
            style={{ fontFamily: headingFont }}
          >
            {c.heroTitle}
          </h1>
          <p className="mt-6 max-w-[560px] text-[16px] leading-[2] text-[#4C5A52] sm:text-[17px]">
            {c.heroSub}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="rounded-[12px] bg-[#0F5132] px-7 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-[#14231B]"
            >
              {c.heroCta}
            </Link>
            <span className="text-[13px] text-[#8A9690]">{c.heroNote}</span>
          </div>
        </div>
        <div
          aria-hidden
          className="mt-10 h-1 w-24 rounded-full bg-[#E8B931]"
        />
      </section>

      {/* ── Problem (dark band) ── */}
      <section className="bg-[#0B3B26] text-[#DCE7DF]">
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:py-20">
          <p className="font-[var(--font-manrope)] text-[11px] font-semibold tracking-[.24em] text-[#8FB49E]">
            {c.problemKicker.toUpperCase()}
          </p>
          <h2
            className="mt-4 max-w-[720px] text-[26px] font-bold leading-[1.5] sm:text-[34px]"
            style={{ fontFamily: headingFont }}
          >
            {c.problemTitle}
          </h2>
          <p className="mt-5 max-w-[640px] text-[15px] leading-[2] text-[#B7CFC0] sm:text-[16px]">
            {c.problemBody}
          </p>
        </div>
      </section>

      {/* ── Demo ── */}
      <section className="mx-auto max-w-[1120px] px-5 py-16 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="font-[var(--font-manrope)] text-[11px] font-semibold tracking-[.24em] text-[#0F5132]">
              {c.demoKicker.toUpperCase()}
            </p>
            <h2
              className="mt-4 text-[26px] font-bold leading-[1.5] sm:text-[32px]"
              style={{ fontFamily: headingFont }}
            >
              {c.demoTitle}
            </h2>
            <p className="mt-5 max-w-[440px] text-[15px] leading-[2] text-[#4C5A52]">
              {c.demoBody}
            </p>
          </div>
          <div className="rounded-[20px] border border-[#E7E2D6] bg-[#FBF9F4] p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-[#0B3B26] font-[var(--font-noto-nastaliq-urdu)] text-[13px] font-bold text-[#E8B931]">
                ر
              </span>
              <span className="text-[12px] font-medium text-[#6B7A70]">
                {lang === "ur" ? "معاون" : "Assistant"}
              </span>
            </div>
            <div className="min-h-[300px]">
              <LandingChatDemo key={lang} lang={lang} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:py-24">
          <p className="font-[var(--font-manrope)] text-[11px] font-semibold tracking-[.24em] text-[#0F5132]">
            {c.featuresKicker.toUpperCase()}
          </p>
          <h2
            className="mt-4 max-w-[560px] text-[26px] font-bold leading-[1.5] sm:text-[32px]"
            style={{ fontFamily: headingFont }}
          >
            {c.featuresTitle}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.map(([icon, title, body]) => (
              <div
                key={title}
                className="rounded-[16px] border border-[#E7E2D6] bg-[#FBF9F4] p-5"
              >
                <div className="text-[22px]">{icon}</div>
                <h3
                  className="mt-3 text-[16px] font-bold"
                  style={{ fontFamily: headingFont }}
                >
                  {title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.95] text-[#6B7A70]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety ── */}
      <section className="mx-auto max-w-[1120px] px-5 py-16 sm:py-24">
        <p className="font-[var(--font-manrope)] text-[11px] font-semibold tracking-[.24em] text-[#0F5132]">
          {c.safetyKicker.toUpperCase()}
        </p>
        <h2
          className="mt-4 text-[26px] font-bold leading-[1.5] sm:text-[32px]"
          style={{ fontFamily: headingFont }}
        >
          {c.safetyTitle}
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {c.safety.map(([title, body]) => (
            <div key={title}>
              <div
                aria-hidden
                className="mb-3 h-1 w-10 rounded-full bg-[#E8B931]"
              />
              <h3
                className="text-[15px] font-bold"
                style={{ fontFamily: headingFont }}
              >
                {title}
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.95] text-[#6B7A70]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="bg-[#0B3B26] text-[#DCE7DF]">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <h2
            className="max-w-[520px] text-[24px] font-bold leading-[1.5] sm:text-[30px]"
            style={{ fontFamily: headingFont }}
          >
            {c.footerTitle}
          </h2>
          <Link
            href="/signup"
            className="rounded-[12px] bg-[#E8B931] px-7 py-3.5 text-[15px] font-semibold text-[#0B3B26] transition-colors hover:bg-[#f2c846]"
          >
            {c.footerCta}
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-[1120px] px-5 py-8">
        <p className="text-[12px] text-[#8A9690]">
          Raqam-AI · Bano Qabil AI Hackathon
        </p>
      </footer>
    </div>
  );
}
