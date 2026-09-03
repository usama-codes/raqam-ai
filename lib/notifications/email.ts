// lib/notifications/email.ts — Gmail SMTP transport via nodemailer.
//
// Only imported from "use node" Convex actions (convex/notifications.ts) —
// nodemailer needs Node's `net`/`tls`, which isn't available in Convex's
// default V8 runtime. Reads GMAIL_USER / GMAIL_APP_PASSWORD from the Convex
// deployment environment (see .env.example for setup).

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD not set in the Convex deployment env.",
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return transporter;
}

/** Send a plain-text alert email. Throws on failure — the caller decides
 * whether that failure blocks recording the notification as sent. */
export async function sendAlertEmail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: `"Raqam AI" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  });
}
