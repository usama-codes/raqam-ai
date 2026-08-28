/* ── Assistant page — pixel-accurate replication ── */

export default function AssistantPage() {
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
                اردو · آپ کے 41 لین دین سے جڑا ہوا
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
          {/* Q1: Inflation educate */}
          <div className="flex max-w-[66%] flex-col gap-1.5 self-start">
            <div className="rounded-[16px_16px_16px_4px] bg-[#0F5132] px-[18px] py-3.5 text-[16px] leading-[2] text-[#EAF1EB]">
              انفلیشن کیا ہوتی ہے اور میری تنخواہ پر اس کا اثر کیسے پڑتا ہے؟
            </div>
            <span className="pr-1 font-[var(--font-manrope)] text-[11px] text-[#8A9690]">
              آپ · 10:12
            </span>
          </div>
          <div className="flex max-w-[78%] flex-col gap-2 self-end">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-full bg-[#EDF1FA] px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em] text-[#31518F]">
                EDUCATE · مالی تعلیم
              </span>
            </div>
            <div className="flex flex-col gap-3 rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-[18px] text-[16px] leading-[2.1]">
              <p>
                انفلیشن (مہنگائی) کا مطلب ہے کہ وقت گزرنے کے ساتھ چیزوں کی
                قیمتیں بڑھ جاتی ہیں، اس لیے اتنے ہی پیسوں میں پہلے سے کم چیزیں
                آتی ہیں۔
              </p>
              <p>
                اگر آپ کی تنخواہ سال بھر ایک جیسی رہے اور مہنگائی 12٪ ہو، تو آپ
                کی اصل خرید طاقت تقریباً اتنی ہی کم ہو جاتی ہے — تنخواہ کم نہیں
                ہوئی، مگر اس سے ملنے والا سامان کم ہو گیا۔
              </p>
              <p>
                اسی لیے بچت کو صرف رکھ چھوڑنے کے بجائے کسی ایسی جگہ رکھنا اہم ہے
                جہاں اس پر منافع ملے، اور ہر سال بجٹ کی حدیں مہنگائی کے حساب سے
                دوبارہ دیکھنی چاہیے۔
              </p>
              <div className="rounded-[10px] bg-[#FBF9F4] px-3.5 py-3 text-[14px] leading-[1.9] text-[#6B7A70]">
                یہ عمومی مالی معلومات ہیں۔ اس جواب میں آپ کا ذاتی ڈیٹا استعمال
                نہیں کیا گیا۔
              </div>
            </div>
          </div>

          {/* Q2: Food spending analyze */}
          <div className="flex max-w-[66%] flex-col gap-1.5 self-start">
            <div className="rounded-[16px_16px_16px_4px] bg-[#0F5132] px-[18px] py-3.5 text-[16px] leading-[2] text-[#EAF1EB]">
              اس مہینے کھانے پر کتنا خرچ ہوا؟
            </div>
            <span className="pr-1 font-[var(--font-manrope)] text-[11px] text-[#8A9690]">
              آپ · 10:14
            </span>
          </div>
          <div className="flex max-w-[78%] flex-col gap-2 self-end">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-full bg-[#E6EFE9] px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em] text-[#0F5132]">
                ANALYZE · آپ کے ڈیٹا سے
              </span>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-[18px] text-[16px] leading-[2.1]">
              <p>
                آپ کے اگست کے 14 لین دین کے مطابق کھانا و گروسری پر{" "}
                <strong className="font-[var(--font-manrope)]">
                  Rs. 28,400
                </strong>{" "}
                خرچ ہوئے — یہ آپ کی Rs. 34,000 کی حد کا 84٪ ہے۔
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { l: "گروسری", v: "Rs. 21,500" },
                  { l: "باہر کا کھانا", v: "Rs. 6,900" },
                  { l: "پچھلے مہینے سے", v: "9٪ زیادہ", vColor: "#C4622D" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="flex flex-col gap-1 rounded-[12px] bg-[#FBF9F4] p-3.5"
                  >
                    <span className="text-[13px] text-[#6B7A70]">{s.l}</span>
                    <span
                      className="font-[var(--font-manrope)] font-bold"
                      style={s.vColor ? { color: s.vColor } : undefined}
                    >
                      {s.v}
                    </span>
                  </div>
                ))}
              </div>
              <p>
                مہینے میں 4 دن باقی ہیں۔ روزانہ کی موجودہ رفتار (Rs. 1,050) پر
                آپ تقریباً Rs. 32,600 پر پہنچیں گے — حد کے اندر، مگر گنجائش کم
                ہے۔
              </p>
              <div className="flex flex-wrap gap-2 border-t border-[#F1EEE4] pt-3">
                <span className="rounded-[8px] bg-[#F1EEE4] px-2.5 py-1.5 font-[var(--font-manrope)] text-[12px] text-[#4C5A52]">
                  حوالہ: transactions · اگست 2026 · 14 اندراج
                </span>
                <span className="rounded-[8px] bg-[#F1EEE4] px-2.5 py-1.5 font-[var(--font-manrope)] text-[12px] text-[#4C5A52]">
                  حوالہ: budgets · کھانا و گروسری
                </span>
              </div>
            </div>
          </div>

          {/* Q3: Phone purchase recommend */}
          <div className="flex max-w-[66%] flex-col gap-1.5 self-start">
            <div className="rounded-[16px_16px_16px_4px] bg-[#0F5132] px-[18px] py-3.5 text-[16px] leading-[2] text-[#EAF1EB]">
              کیا میں اس مہینے 15,000 کا فون خرید سکتی ہوں؟
            </div>
            <span className="pr-1 font-[var(--font-manrope)] text-[11px] text-[#8A9690]">
              آپ · 10:16
            </span>
          </div>
          <div className="flex max-w-[78%] flex-col gap-2 self-end">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-full bg-[#FDF3D8] px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em] text-[#6B5B2E]">
                RECOMMEND · مشورہ
              </span>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[16px_16px_4px_16px] border border-[#E7E2D6] bg-white px-5 py-[18px] text-[16px] leading-[2.1]">
              <div className="flex flex-col gap-1">
                <span className="font-[var(--font-manrope)] text-[11px] tracking-[.14em] text-[#8A9690]">
                  کیا صورتحال ہے؟
                </span>
                <p>
                  اس وقت آپ کے پاس اس مہینے Rs. 52,600 کی بچت ہے، مگر اگلے 7 دن
                  میں Rs. 26,000 کے بل متوقع ہیں (انٹرنیٹ، بجلی، اسکول فیس)۔
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-[var(--font-manrope)] text-[11px] tracking-[.14em] text-[#8A9690]">
                  اس کا کیا اثر ہے؟
                </span>
                <p>
                  Rs. 15,000 کا فون لینے کے بعد Rs. 11,600 باقی رہیں گے، اور آپ
                  کی بچت کی شرح 28٪ سے 20٪ پر آ جائے گی۔ ایمرجنسی فنڈ میں اس
                  مہینے کوئی رقم نہیں جائے گی۔
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-[var(--font-manrope)] text-[11px] tracking-[.14em] text-[#8A9690]">
                  کیا کیا جا سکتا ہے؟
                </span>
                <p>
                  دو راستے ہیں: اگلے مہینے کے شروع میں خریدیں جب تنخواہ آ چکی
                  ہو، یا اس مہینے آدھی رقم (Rs. 7,500) ادا کریں اور باقی ستمبر
                  میں۔
                </p>
              </div>
              <div className="flex flex-col gap-2 rounded-[12px] border border-[#CBD9CF] bg-[#F4F8F5] px-4 py-3.5">
                <span className="font-[var(--font-manrope)] text-[11px] tracking-[.14em] text-[#0F5132]">
                  اگر آپ ایک مہینہ انتظار کریں
                </span>
                <div className="flex flex-wrap gap-[26px] text-[14px]">
                  <span>
                    بچت کی شرح:{" "}
                    <strong className="font-[var(--font-manrope)]">
                      28٪ برقرار
                    </strong>
                  </span>
                  <span>
                    ایمرجنسی فنڈ:{" "}
                    <strong className="font-[var(--font-manrope)]">
                      + Rs. 12,000
                    </strong>
                  </span>
                  <span>
                    خطرہ:{" "}
                    <strong className="font-[var(--font-manrope)]">کم</strong>
                  </span>
                </div>
              </div>
              <p className="text-[14px] leading-[1.9] text-[#6B7A70]">
                یہ اندازہ آپ کے اگست کے لین دین اور مقرر کردہ بلوں پر مبنی ہے۔
                آنے والے غیر متوقع خرچ اس میں شامل نہیں۔
              </p>
            </div>
          </div>

          {/* Q4: Voice input */}
          <div className="flex max-w-[66%] flex-col gap-1.5 self-start">
            <div className="flex items-center gap-2.5 rounded-[16px_16px_16px_4px] bg-[#0F5132] px-[18px] py-3.5 text-[16px] leading-[2] text-[#EAF1EB]">
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[13px]">
                آواز
              </span>
              <span>آج 850 روپے پیٹرول پر خرچ ہوئے</span>
            </div>
            <span className="pr-1 font-[var(--font-manrope)] text-[11px] text-[#8A9690]">
              آپ · آواز سے لکھا گیا · 10:19
            </span>
          </div>

          {/* Action confirmation */}
          <div className="flex max-w-[78%] flex-col gap-2 self-end">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-full bg-[#FDF3D8] px-2.5 py-1 font-[var(--font-manrope)] text-[10px] tracking-[.14em] text-[#6B5B2E]">
                ACT · تصدیق درکار ہے
              </span>
            </div>
            <div className="flex flex-col gap-3.5 rounded-[16px_16px_4px_16px] border border-[#E8CE86] bg-white px-5 py-[18px]">
              <p className="text-[16px] leading-[2.1]">
                میں یہ لین دین شامل کرنے جا رہا ہوں۔ تصدیق کر دیں تو محفوظ کر
                دوں گا:
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-[12px] border border-[#E7E2D6] bg-[#FBF9F4] p-4 text-[15px]">
                {[
                  { l: "رقم", v: "Rs. 850", bold: true },
                  { l: "قسم", v: "خرچ" },
                  { l: "زمرہ", v: "آمدورفت" },
                  { l: "تاریخ", v: "27 اگست 2026" },
                  { l: "تفصیل", v: "پیٹرول" },
                  { l: "اعتماد", v: "بلند", vColor: "#0F5132" },
                ].map((f) => (
                  <div key={f.l} className="flex justify-between">
                    <span className="text-[#6B7A70]">{f.l}</span>
                    <span
                      className={
                        f.bold ? "font-[var(--font-manrope)] font-bold" : ""
                      }
                      style={f.vColor ? { color: f.vColor } : undefined}
                    >
                      {f.v}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-[10px] bg-[#FDF3D8] px-3.5 py-3 text-[14px] leading-[1.9] text-[#6B5B2E]">
                اس کے بعد آمدورفت کا بجٹ 70٪ سے 75٪ ہو جائے گا۔
              </div>
              <div className="flex gap-2.5">
                <button className="rounded-[10px] border-0 bg-[#0F5132] px-[22px] py-3 text-[15px] font-semibold text-white">
                  تصدیق کریں
                </button>
                <button className="rounded-[10px] border-0 bg-[#F1EEE4] px-5 py-3 text-[15px]">
                  تبدیل کریں
                </button>
                <button className="rounded-[10px] border border-[#E7D6D4] bg-transparent px-5 py-3 text-[15px] text-[#B3261E]">
                  منسوخ
                </button>
              </div>
            </div>
          </div>
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
              <span
                key={s}
                className="cursor-pointer rounded-full bg-[#F1EEE4] px-3.5 py-2 text-[14px]"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2.5 rounded-[14px] border border-[#DCD6C8] bg-[#FBF9F4] px-4 py-3">
            <span className="flex-1 text-[16px] text-[#9BA79F]">
              اردو میں لکھیں… مثلاً &quot;پچھلے مہینے سب سے زیادہ خرچ کہاں
              ہوا؟&quot;
            </span>
            <button className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]">
              آواز
            </button>
            <button className="rounded-[10px] border-0 bg-[#E6EFE9] px-3.5 py-2.5 text-[13px] text-[#0F5132]">
              رسید
            </button>
            <button className="rounded-[10px] border-0 bg-[#0F5132] px-[18px] py-2.5 text-[14px] text-white">
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
        {/* Receipt OCR */}
        <div className="flex flex-col gap-3">
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
            RECEIPT · رسید سے اندراج
          </span>
          <div className="overflow-hidden rounded-[14px] border border-[#E7E2D6]">
            <div
              className="grid h-[120px] place-items-center text-[13px] text-[#8A9690]"
              style={{
                background:
                  "repeating-linear-gradient(135deg,#F1EEE4,#F1EEE4 10px,#EAE6DA 10px,#EAE6DA 20px)",
              }}
            >
              رسید کی تصویر
            </div>
            <div className="flex flex-col gap-2.5 p-4">
              <span className="text-[13px] text-[#6B7A70]">
                پڑھی گئی معلومات — ضرورت ہو تو درست کر لیں
              </span>
              {[
                { label: "دکان", value: "الفتح اسٹور" },
                { label: "رقم", value: "3,240", mono: true },
                { label: "تاریخ", value: "27 اگست 2026" },
              ].map((f) => (
                <label
                  key={f.label}
                  className="flex flex-col gap-1.5 text-[13px] text-[#4C5A52]"
                >
                  {f.label}
                  <input
                    defaultValue={f.value}
                    readOnly
                    className={`rounded-[9px] border border-[#DCD6C8] bg-[#FBF9F4] px-3 py-[9px] text-[14px] ${f.mono ? "font-[var(--font-manrope)]" : ""}`}
                  />
                </label>
              ))}
              <div className="flex justify-between text-[13px] text-[#6B7A70]">
                <span>تجویز کردہ زمرہ</span>
                <span className="text-[#14231B]">کھانا و گروسری</span>
              </div>
              <button className="rounded-[10px] border-0 bg-[#0F5132] py-[11px] text-[14px] text-white">
                تصدیق کے لیے بھیجیں
              </button>
              <button className="text-[13px] text-[#0F5132]">
                تصویر صاف نہیں؟ دستی اندراج کریں
              </button>
            </div>
          </div>
        </div>

        {/* Context */}
        <div className="flex flex-col gap-2.5 border-t border-[#F1EEE4] pt-[18px]">
          <span className="font-[var(--font-manrope)] text-[11px] tracking-[.16em] text-[#8A9690]">
            CONTEXT · معاون کو کیا نظر آ رہا ہے
          </span>
          <div className="flex flex-col gap-2 text-[14px] text-[#4C5A52]">
            {[
              { l: "اگست کے لین دین", v: "41" },
              { l: "فعال بجٹ زمرے", v: "7" },
              { l: "بچت کے اہداف", v: "3" },
              { l: "پچھلے مہینے کا خلاصہ", v: "دستیاب" },
            ].map((c) => (
              <div key={c.l} className="flex justify-between">
                <span>{c.l}</span>
                <span className="font-[var(--font-manrope)]">{c.v}</span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.9] text-[#8A9690]">
            معاون کے پاس صرف یہی خلاصہ جاتا ہے۔ پاس ورڈ، اکاؤنٹ نمبر یا کارڈ کی
            معلومات کبھی شامل نہیں کی جاتیں۔
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
