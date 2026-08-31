"use client";

import * as React from "react";

type Lang = "ur" | "en";

interface Turn {
  role: "user" | "assistant" | "card";
  text?: string;
  card?: { title: string; amount: string; category: string };
}

const SCRIPT: Record<Lang, Turn[]> = {
  ur: [
    { role: "user", text: "اس مہینے کھانے پر کتنا خرچ ہوا؟" },
    {
      role: "assistant",
      text: "آپ کے لین دین کے مطابق اس مہینے کھانے پر Rs. 15,800 خرچ ہوئے — یہ آپ کے Rs. 18,000 بجٹ کا 88٪ ہے۔",
    },
    { role: "user", text: "500 کا پیٹرول شامل کرو" },
    {
      role: "card",
      card: { title: "نیا خرچ", amount: "Rs. 500", category: "نقل و حمل" },
    },
  ],
  en: [
    { role: "user", text: "How much did I spend on food this month?" },
    {
      role: "assistant",
      text: "Based on your transactions, you've spent Rs. 15,800 on food this month — 88% of your Rs. 18,000 budget.",
    },
    { role: "user", text: "Add 500 for petrol" },
    {
      role: "card",
      card: { title: "New expense", amount: "Rs. 500", category: "Transport" },
    },
  ],
};

const LABELS: Record<Lang, { proposed: string; confirm: string; reject: string; you: string; assistant: string }> = {
  ur: { proposed: "تجویز کردہ کارروائی", confirm: "تصدیق کریں", reject: "منسوخ", you: "آپ", assistant: "رقم" },
  en: { proposed: "Proposed action", confirm: "Confirm", reject: "Cancel", you: "You", assistant: "Raqam" },
};

/**
 * A scripted, looping preview of the assistant conversation. No backend — the
 * turns reveal on a timer with a typing indicator before each assistant reply.
 * Mounted with `key={lang}` by the parent, so a language switch remounts it
 * fresh and the effect never has to reset state synchronously.
 */
export function LandingChatDemo({ lang }: { lang: Lang }) {
  const script = SCRIPT[lang];
  const L = LABELS[lang];
  const [shown, setShown] = React.useState(0); // turns fully visible
  const [typing, setTyping] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const run = (i: number) => {
      if (cancelled) return;
      if (i >= script.length) {
        // Hold the finished conversation, then reset and loop.
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setShown(0);
            run(0);
          }, 4000),
        );
        return;
      }
      const turn = script[i];
      const preDelay = i === 0 ? 500 : 900;
      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          if (turn.role === "assistant") {
            setTyping(true);
            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setTyping(false);
                setShown(i + 1);
                run(i + 1);
              }, 1100),
            );
          } else {
            setShown(i + 1);
            run(i + 1);
          }
        }, preDelay),
      );
    };
    run(0);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [script]);

  return (
    <div className="flex flex-col gap-3">
      {script.slice(0, shown).map((turn, i) => (
        <TurnView key={`${lang}-${i}`} turn={turn} L={L} />
      ))}
      {typing && <TypingDots />}
    </div>
  );
}

function TurnView({ turn, L }: { turn: Turn; L: (typeof LABELS)[Lang] }) {
  if (turn.role === "card" && turn.card) {
    return (
      <div
        className="self-end max-w-[85%] rounded-[16px_16px_4px_16px] border-2 border-[#E8B931] bg-[#FDF8EC] px-4 py-3"
        style={{ animation: "lp-pop .4s ease-out both" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[15px]">➕</span>
          <span className="font-[var(--font-manrope)] text-[10px] tracking-[.14em] text-[#6B5B2E]">
            {L.proposed}
          </span>
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#E6EFE9] px-2.5 py-1 text-[12px] font-medium text-[#0F5132]">
            {turn.card.amount}
          </span>
          <span className="rounded-full bg-[#E6EFE9] px-2.5 py-1 text-[12px] text-[#4C5A52]">
            {turn.card.category}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="rounded-[8px] bg-[#0F5132] px-3.5 py-1.5 text-[12px] font-medium text-white">
            {L.confirm}
          </span>
          <span className="rounded-[8px] border border-[#DCD6C8] bg-white px-3.5 py-1.5 text-[12px] text-[#6B7A70]">
            {L.reject}
          </span>
        </div>
      </div>
    );
  }

  const isUser = turn.role === "user";
  return (
    <div
      className={`max-w-[85%] ${isUser ? "self-end" : "self-start"}`}
      style={{ animation: "lp-pop .4s ease-out both" }}
    >
      <div
        className={
          isUser
            ? "rounded-[16px_16px_4px_16px] bg-[#0F5132] px-4 py-2.5 text-[14px] leading-[1.9] text-white"
            : "rounded-[16px_16px_16px_4px] border border-[#E7E2D6] bg-white px-4 py-2.5 font-reading text-[14px] text-[#14231B]"
        }
      >
        {turn.text}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="self-start rounded-[16px_16px_16px_4px] border border-[#E7E2D6] bg-white px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[#8FB49E]"
            style={{ animation: `rq-glow 1s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
