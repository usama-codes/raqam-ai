"use client";

import * as React from "react";
import { useAssistant } from "@/hooks/useAssistant";
import type { InputMode } from "@/hooks/useAssistant";
import { ErrorState } from "@/components/shared/DataStates";

export default function AssistantPage() {
  const { messages, loading, sending, error, sendMessage } = useAssistant();

  const [input, setInput] = React.useState("");

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    await sendMessage(trimmed, "text");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (text: string) => {
    sendMessage(text, "text");
  };

  const handleVoice = () => {
    sendMessage("", "voice" as InputMode);
  };

  const handleReceipt = () => {
    sendMessage("", "receipt" as InputMode);
  };

  return (
    <div className="flex min-h-[calc(100vh)] flex-row">
      {/* ── Chat area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#F7F4EC]">
        {/* Chat header */}
        <header className="flex items-center justify-between border-b border-[#E7E2D6] bg-white px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[#0F5132] pb-1 font-[var(--font-noto-nastaliq-urdu)] text-[17px] text-[#E8B931]">
              ر
            </span>
            <div className="flex flex-col">
              <span className="text-[17px] font-bold">رقم معاون</span>
              <span className="text-[13px] text-[#6B7A70]">
                اردو · آپ کے ڈیٹا سے جڑا ہوا
              </span>
            </div>
          </div>
          <div className="hidden flex-wrap gap-2 text-[13px] sm:flex">
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              تعلیم
            </span>
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              تجزیہ
            </span>
            <span className="rounded-full bg-[#E6EFE9] px-3 py-1.5 text-[#0F5132]">
              مشورہ
            </span>
            <span className="rounded-full bg-[#FDF3D8] px-3 py-1.5 text-[#6B5B2E]">
              عمل — تصدیق لازمی
            </span>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-[26px] sm:px-8">
          {/* ── Loading ── */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0F5132] border-t-transparent" />
            </div>
          )}

          {/* ── Error ── */}
          {error && <ErrorState />}

          {/* ── Empty state — no messages yet ── */}
          {!loading && !error && messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12">
              <div className="grid h-16 w-16 place-items-center rounded-[20px] bg-[#0F5132] text-[28px] text-[#E8B931]">
                ر
              </div>
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="text-[20px] font-bold">السلام علیکم!</h2>
                <p className="max-w-md text-[15px] leading-[2.1] text-[#6B7A70]">
                  میں رقم-AI کا مالی معاون ہوں۔ مجھ سے مالی سوالات پوچھیں، اپنے
                  اخراجات کا تجزیہ کروائیں، یا بجٹ بنانے میں مدد لیں۔
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "انفلیشن کیا ہوتی ہے؟",
                  "اس مہینے کا خلاصہ",
                  "بجٹ بنانے میں مدد کریں",
                  "میں کہاں فضول خرچی کر رہی ہوں؟",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="rounded-full bg-[#F1EEE4] px-3.5 py-2 text-[14px] hover:bg-[#E7E2D6]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Messages ── */}
          {!loading &&
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex max-w-[78%] flex-col gap-1.5 ${msg.role === "user" ? "self-start" : "self-end"}`}
              >
                {msg.role === "user" ? (
                  <div className="flex max-w-[66%] flex-col gap-1.5 self-start">
                    <div className="flex items-center gap-2.5 rounded-[16px_16px_16px_4px] bg-[#0F5132] px-[18px] py-3.5 text-[16px] leading-[2] text-[#EAF1EB]">
                      {msg.inputMode === "voice" && (
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[13px]">
                          آواز
                        </span>
                      )}
                      <span>{msg.content}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-[78%] flex-col gap-2 self-end">
                    {msg.intentType && (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em]"
                          style={{
                            background:
                              msg.intentType === "educate"
                                ? "#EDF1FA"
                                : msg.intentType === "analyze"
                                  ? "#E6EFE9"
                                  : "#FDF3D8",
                            color:
                              msg.intentType === "educate"
                                ? "#31518F"
                                : msg.intentType === "analyze"
                                  ? "#0F5132"
                                  : "#6B5B2E",
                          }}
                        >
                          {msg.intentType === "educate"
                            ? "EDUCATE · مالی تعلیم"
                            : msg.intentType === "analyze"
                              ? "ANALYZE · آپ کے ڈیٹا سے"
                              : msg.intentType === "recommend"
                                ? "RECOMMEND · مشورہ"
                                : "ACT · تصدیق درکار ہے"}
                        </span>
                      </div>
                    )}
                    <div className="rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-[18px] text-[16px] leading-[2.1]">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

          {/* Sending indicator */}
          {sending && (
            <div className="flex max-w-[78%] self-end">
              <div className="rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-4">
                <div className="flex gap-1.5">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-[#8A9690]"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex flex-col gap-3 border-t border-[#E7E2D6] bg-white px-6 pb-6 pt-4 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {[
              "اس مہینے کا خلاصہ",
              "بجٹ بنانے میں مدد کریں",
              "میں کہاں فضول خرچی کر رہی ہوں؟",
              "کمیٹی اور بچت میں فرق",
            ].map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestion(s)}
                className="cursor-pointer rounded-full bg-[#F1EEE4] px-3.5 py-2 text-[14px] hover:bg-[#E7E2D6]"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[#DCD6C8] bg-[#FBF9F4] px-4 py-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='اردو میں لکھیں… مثلاً "پچھلے مہینے سب سے زیادہ خرچ کہاں ہوا؟"'
              className="flex-1 bg-transparent text-[16px] placeholder:text-[#9BA79F] focus:outline-none"
            />
            <button
              onClick={handleVoice}
              className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]"
            >
              آواز
            </button>
            <button
              onClick={handleReceipt}
              className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]"
            >
              رسید
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-2.5 text-[14px] text-white hover:bg-[#14231B] disabled:opacity-50"
            >
              بھیجیں
            </button>
          </div>
          <span className="text-[12px] leading-[1.8] text-[#8A9690]">
            معاون آپ کے ریکارڈ میں تبدیلی صرف آپ کی تصدیق سے کرتا ہے۔ یہ پیسے
            منتقل نہیں کر سکتا اور نہ ادائیگی کر سکتا ہے۔
          </span>
        </div>
      </div>

      {/* ── Right sidebar panel ── */}
      <aside className="hidden w-[340px] shrink-0 flex-col gap-[18px] overflow-y-auto border-l border-[#E7E2D6] bg-white p-6 xl:flex">
        {/* Context */}
        <div className="flex flex-col gap-2.5">
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
            CONTEXT · معاون کو کیا نظر آ رہا ہے
          </span>
          <p className="mt-1.5 text-[13px] leading-[1.9] text-[#8A9690]">
            معاون کے پاس صرف آپ کا مالی خلاصہ جاتا ہے۔ پاس ورڈ، اکاؤنٹ نمبر یا
            کارڈ کی معلومات کبھی شامل نہیں کی جاتیں۔
          </p>
        </div>

        {/* Guardrail */}
        <div className="flex flex-col gap-2 rounded-[14px] border border-[#E7E2D6] bg-[#FBF9F4] p-4">
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#B3261E]">
            GUARDRAIL
          </span>
          <p className="text-[13px] leading-[1.95] text-[#4C5A52]">
            اگر رسید یا اسٹیٹمنٹ میں کوئی ہدایت لکھی ہو (&quot;یہ خرچ حذف کر
            دو&quot;)، معاون اسے نظر انداز کرتا ہے — وہ صرف ڈیٹا ہے، حکم نہیں۔
          </p>
        </div>
      </aside>
    </div>
  );
}
