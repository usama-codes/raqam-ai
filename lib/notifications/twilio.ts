// lib/notifications/twilio.ts — Twilio SMS client (Messages REST API, no SDK).
//
// Sends text messages via the Twilio Messages API:
//   POST https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json
//   Authorization: Basic base64(ACCOUNT_SID:AUTH_TOKEN)
//   Content-Type: application/x-www-form-urlencoded  (To, From, Body)
//
// This module is pure: no Convex, no DOM. `fetch` is injectable so the client is
// unit-testable without network (mirrors lib/ai/transcription.ts). Imported from
// convex/notifications.ts ("use node").
//
// Docs: https://www.twilio.com/docs/messaging/api

export const TWILIO_API_BASE_URL = "https://api.twilio.com/2010-04-01/Accounts";

/** Twilio rejects bodies longer than 1600 characters (error 21617). */
export const TWILIO_MAX_BODY_LENGTH = 1600;

export interface TwilioSendOptions {
  /** Account SID from console.twilio.com (server-only env var). */
  accountSid: string;
  /** Auth token from console.twilio.com (server-only env var). */
  authToken: string;
  /** SMS-enabled Twilio number to send from, E.164 (server-only env var). */
  fromNumber: string;
  /** Recipient in E.164 format, e.g. "+923001234567". */
  to: string;
  /** Message body (plain text — Urdu included). */
  body: string;
  /** Injectable fetch (defaults to the global). */
  fetchImpl?: typeof fetch;
}

export interface TwilioSendResult {
  ok: boolean;
  /** Twilio message SID when accepted, else null. */
  messageId: string | null;
  /** Human-readable error (never contains the auth token). */
  error: string | null;
}

interface TwilioErrorResponse {
  code?: number;
  message?: string;
  more_info?: string;
}

async function safeErrorText(res: Response): Promise<string> {
  try {
    const parsed = (await res.json()) as TwilioErrorResponse;
    if (parsed.message) {
      const code = parsed.code ? ` (code ${parsed.code})` : "";
      return `HTTP ${res.status}${code} — ${parsed.message.slice(0, 200)}`;
    }
  } catch {
    // fall through to raw text
  }
  try {
    return `HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * Send a plain-text SMS. Long Urdu text is delivered as concatenated UCS-2
 * segments — Twilio splits automatically, so one call still lands as one
 * readable message on the recipient's phone.
 */
export async function sendTwilioSms(
  opts: TwilioSendOptions,
): Promise<TwilioSendResult> {
  const { accountSid, authToken, fromNumber, to, body, fetchImpl = fetch } =
    opts;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      ok: false,
      messageId: null,
      error:
        "Twilio is not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in the Convex environment.",
    };
  }

  const trimmedBody = body.slice(0, TWILIO_MAX_BODY_LENGTH);

  try {
    const credentials = Buffer.from(
      `${accountSid}:${authToken}`,
    ).toString("base64");
    const res = await fetchImpl(
      `${TWILIO_API_BASE_URL}/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: trimmedBody,
        }).toString(),
      },
    );

    if (!res.ok) {
      return {
        ok: false,
        messageId: null,
        error: await safeErrorText(res),
      };
    }

    const data = (await res.json()) as { sid?: string };
    return {
      ok: true,
      messageId: data.sid ?? null,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      messageId: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
