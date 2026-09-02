import { describe, it, expect, vi } from "vitest";
import {
  sendTwilioSms,
  TWILIO_API_BASE_URL,
  TWILIO_MAX_BODY_LENGTH,
} from "@/lib/notifications/twilio";
import { normalizePakistaniPhone } from "@/lib/notifications/phone";
import {
  fillTemplate,
  formatRupees,
  urduMonthName,
  urduDayMonth,
  daysUntil,
  buildBudgetApproachingMessage,
  buildBudgetReachedMessage,
  buildBillDueMessage,
  buildMonthlySummaryMessage,
  buildTestMessage,
  budgetDedupKey,
  billDedupKey,
  monthlySummaryDedupKey,
} from "@/lib/notifications/messages";

// ─── Fake fetch helpers ────────────────────────────────────────────────────────

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── normalizePakistaniPhone ───────────────────────────────────────────────────

describe("normalizePakistaniPhone", () => {
  it.each([
    ["0300 1234567", "+923001234567"], // spaced local
    ["0300-1234567", "+923001234567"], // dashed local
    ["0321 1234567", "+923211234567"], // different mobile prefix
    ["+923001234567", "+923001234567"], // E.164 with plus
    ["923001234567", "+923001234567"], // country code without plus
    ["3001234567", "+923001234567"], // bare national, no leading zero
    ["+92 300 1234567", "+923001234567"], // fully spaced E.164
  ])("normalizes %s → %s", (input, expected) => {
    expect(normalizePakistaniPhone(input)).toBe(expected);
  });

  it.each([
    [""], // empty
    ["12345"], // too short / not mobile-shaped
    ["021 1234567"], // landline (Karachi) — only mobiles are accepted
    ["0300123456 extra"], // non-digit junk survives stripping
    ["+9212345678901"], // right prefix, too many digits
    ["+14155550123"], // not a Pakistani number at all
  ])("rejects %s", (input) => {
    expect(normalizePakistaniPhone(input)).toBeNull();
  });
});

// ─── sendTwilioSms ─────────────────────────────────────────────────────────────

describe("sendTwilioSms", () => {
  const base = {
    accountSid: "ACtest123",
    authToken: "test-token",
    fromNumber: "+14155550123",
    to: "+923001234567",
  };

  it("posts a Messages API request and returns the message SID", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return jsonResponse({ sid: "SM1234abcd" });
      },
    ) as unknown as typeof fetch;

    const res = await sendTwilioSms({
      ...base,
      body: "السلام علیکم",
      fetchImpl,
    });

    expect(res).toEqual({ ok: true, messageId: "SM1234abcd", error: null });

    expect(calls).toHaveLength(1);
    const { url, init } = calls[0]!;
    expect(url).toBe(`${TWILIO_API_BASE_URL}/ACtest123/Messages.json`);
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    // Basic base64("ACtest123:test-token")
    expect(headers.Authorization).toBe("Basic QUN0ZXN0MTIzOnRlc3QtdG9rZW4=");
    expect(headers["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    );
    const params = new URLSearchParams(String(init?.body));
    expect(params.get("To")).toBe("+923001234567");
    expect(params.get("From")).toBe("+14155550123");
    expect(params.get("Body")).toBe("السلام علیکم");
  });

  it("fails fast without calling the network when credentials are missing", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;

    const res = await sendTwilioSms({
      accountSid: "",
      authToken: "",
      fromNumber: "",
      to: "+923001234567",
      body: "سلام",
      fetchImpl,
    });

    expect(res.ok).toBe(false);
    expect(res.messageId).toBeNull();
    expect(res.error).toMatch(/TWILIO_ACCOUNT_SID/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces the Twilio error message on an HTTP failure", async () => {
    const fetchImpl = (async () =>
      jsonResponse(
        { code: 21211, message: "The 'To' number is not a valid phone number" },
        { ok: false, status: 400 },
      )) as unknown as typeof fetch;

    const res = await sendTwilioSms({ ...base, body: "hi", fetchImpl });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/HTTP 400/);
    expect(res.error).toMatch(/code 21211/);
    expect(res.error).toMatch(/not a valid phone number/);
    expect(res.error).not.toContain("test-token");
  });

  it("falls back to the raw text body when the error is not JSON", async () => {
    const fetchImpl = (async () =>
      ({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("invalid json");
        },
        text: async () => "Bad Gateway",
      }) as unknown as Response) as unknown as typeof fetch;

    const res = await sendTwilioSms({ ...base, body: "hi", fetchImpl });

    expect(res.error).toMatch(/HTTP 502 — Bad Gateway/);
  });

  it("truncates bodies to the Twilio 1600-character cap", async () => {
    let sentBody: string | undefined;
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        sentBody = new URLSearchParams(String(init?.body)).get("Body") ?? "";
        return jsonResponse({ sid: "SM1" });
      },
    ) as unknown as typeof fetch;

    await sendTwilioSms({
      ...base,
      body: "x".repeat(TWILIO_MAX_BODY_LENGTH + 500),
      fetchImpl,
    });

    expect(sentBody!.length).toBe(TWILIO_MAX_BODY_LENGTH);
  });

  it("reports network failures without leaking the auth token", async () => {
    const fetchImpl = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await sendTwilioSms({ ...base, body: "hi", fetchImpl });

    expect(res.ok).toBe(false);
    expect(res.error).toBe("ECONNREFUSED");
    expect(res.error).not.toContain("test-token");
  });
});

// ─── Template filling + formatting helpers ─────────────────────────────────────

describe("fillTemplate", () => {
  it("fills every placeholder with strings or numbers", () => {
    expect(
      fillTemplate("سلام {name}، {amount} روپے", { name: "علی", amount: 500 }),
    ).toBe("سلام علی، 500 روپے");
  });

  it("leaves unknown placeholders untouched rather than dropping them", () => {
    expect(fillTemplate("{a} اور {b}", { a: 1 })).toBe("1 اور {b}");
  });

  it("passes templates without placeholders through unchanged", () => {
    expect(fillTemplate("ٹھیک ہے", {})).toBe("ٹھیک ہے");
  });
});

describe("formatRupees", () => {
  it("groups digits with commas and drops decimals", () => {
    expect(formatRupees(12_000)).toBe("12,000");
    expect(formatRupees(950)).toBe("950");
    expect(formatRupees(0)).toBe("0");
    expect(formatRupees(12_000.6)).toBe("12,001"); // rounds, no cents
  });
});

describe("urdu date helpers", () => {
  it("names Urdu months", () => {
    expect(urduMonthName(Date.UTC(2026, 7, 1))).toBe("اگست"); // August
    expect(urduMonthName(Date.UTC(2026, 0, 1))).toBe("جنوری"); // January
  });

  it("formats day + month for dates", () => {
    expect(urduDayMonth(Date.UTC(2026, 8, 10))).toBe("10 ستمبر");
    expect(urduDayMonth(Date.UTC(2026, 0, 5))).toBe("5 جنوری");
  });

  it("counts whole days until a due date, rounded up", () => {
    const now = Date.UTC(2026, 8, 5);
    expect(daysUntil(now + 5 * DAY_MS, now)).toBe(5); // exact
    expect(daysUntil(now + 2.5 * DAY_MS, now)).toBe(3); // rounds up
    expect(daysUntil(now, now)).toBe(0);
    expect(daysUntil(now - DAY_MS, now)).toBe(-1); // overdue
  });
});

// ─── Message builders ──────────────────────────────────────────────────────────

describe("buildBudgetApproachingMessage", () => {
  it("warns in plain Urdu with the biryani analogy — no percentages", () => {
    const msg = buildBudgetApproachingMessage({
      categoryNameUr: "کھانا",
      spent: 12_000,
      remaining: 3_000,
    });

    expect(msg).toContain("«کھانا»");
    expect(msg).toContain("12,000 روپے خرچ");
    expect(msg).toContain("3,000 روپے باقی");
    // P1/P5 voice: everyday analogy, never raw utilization figures.
    expect(msg).toContain("بریانی");
    expect(msg).not.toContain("%");
    expect(msg).not.toContain("80");
  });

  it("falls back to the English template", () => {
    const msg = buildBudgetApproachingMessage({
      lang: "en",
      categoryNameUr: "Food",
      spent: 12_000,
      remaining: 3_000,
    });

    expect(msg).toContain('"Food"');
    expect(msg).toContain("12,000");
    expect(msg).toContain("3,000");
    expect(msg).toContain("biryani");
  });
});

describe("buildBudgetReachedMessage", () => {
  it("reports the limit crossing in plain Urdu with figures", () => {
    const msg = buildBudgetReachedMessage({
      categoryNameUr: "سفر",
      spent: 51_000,
      limit: 50_000,
    });

    expect(msg).toContain("«سفر»");
    expect(msg).toContain("51,000 روپے خرچ");
    expect(msg).toContain("حد 50,000 روپے");
    expect(msg).toContain("پلیٹ صاف"); // "the plate is clean" analogy
    expect(msg).not.toContain("%");
    expect(msg).not.toMatch(/\{\w+\}/); // every placeholder filled
  });
});

describe("buildBillDueMessage", () => {
  it("reminds about an upcoming bill with the date, days left, and amount", () => {
    const now = Date.UTC(2026, 8, 5);
    const msg = buildBillDueMessage({
      billName: "بجلی کا بل",
      dueTimestampMs: Date.UTC(2026, 8, 10),
      amount: 1_200,
      nowMs: now,
    });

    expect(msg).toContain("«بجلی کا بل»");
    expect(msg).toContain("10 ستمبر");
    expect(msg).toContain("صرف 5 دن");
    expect(msg).toContain("1,200 روپے");
    expect(msg).not.toMatch(/\{\w+\}/);
  });

  it("clamps overdue bills to at least one day so late notices read sensibly", () => {
    const now = Date.UTC(2026, 8, 5);
    const msg = buildBillDueMessage({
      billName: "انٹرنیٹ کا بل",
      dueTimestampMs: now - DAY_MS, // already overdue
      amount: 2_000,
      nowMs: now,
    });

    expect(msg).toContain("صرف 1 دن");
    expect(msg).not.toContain("-1");
  });
});

describe("buildMonthlySummaryMessage", () => {
  it("recaps the month with positive advice when savings are positive", () => {
    const msg = buildMonthlySummaryMessage({
      monthTimestampMs: Date.UTC(2026, 7, 1),
      income: 60_000,
      expenses: 45_000,
      savings: 15_000,
    });

    expect(msg).toContain("اگست");
    expect(msg).toContain("60,000 روپے آئے");
    expect(msg).toContain("45,000 روپے گئے");
    expect(msg).toContain("15,000 روپے بچ");
    expect(msg).toContain("ماشاءاللہ"); // the positive advice line
  });

  it("recaps with gentle advice and an absolute figure when savings are negative", () => {
    const msg = buildMonthlySummaryMessage({
      monthTimestampMs: Date.UTC(2026, 7, 1),
      income: 50_000,
      expenses: 52_000,
      savings: -2_000,
    });

    expect(msg).toContain("2,000 روپے بچ"); // abs(), no minus sign
    expect(msg).not.toContain("-2,000");
    expect(msg).toContain("سنبھالیں"); // the gentle overspending advice
    expect(msg).not.toContain("ماشاءاللہ");
  });
});

describe("buildTestMessage", () => {
  it("returns the Urdu test message by default", () => {
    expect(buildTestMessage()).toContain("رقم معاون");
  });

  it("returns the English test message on request", () => {
    expect(buildTestMessage("en")).toContain("Raqam Assistant");
  });
});

// ─── Dedup keys ────────────────────────────────────────────────────────────────

describe("dedup keys", () => {
  it("scopes budget keys by kind, category, and month", () => {
    expect(budgetDedupKey("budget_approaching", "cat123", 1_234)).toBe(
      "budget_approaching:cat123:1234",
    );
    expect(budgetDedupKey("budget_reached", "cat123", 1_234)).toBe(
      "budget_reached:cat123:1234",
    );
  });

  it("scopes bill keys by recurring expense and due date", () => {
    expect(billDedupKey("re456", 99)).toBe("bill_due:re456:99");
  });

  it("scopes monthly summaries by month", () => {
    expect(monthlySummaryDedupKey(777)).toBe("monthly_summary:777");
  });
});
