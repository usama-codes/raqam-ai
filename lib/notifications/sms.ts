// lib/notifications/sms.ts — AWS End User Messaging SMS (Pinpoint SMS Voice V2).
//
// Only imported from "use node" Convex actions (convex/notifications.ts) —
// the AWS SDK needs Node's `net`/`crypto` for request signing. Reads
// AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_SMS_SENDER_ID
// from the Convex deployment environment (see .env.example for setup).
//
// Pakistan (+92) sends via a registered alphanumeric Sender ID — no
// destination-country pre-registration step required, unlike India/Turkey/
// Vietnam/etc. Destination numbers must be E.164 (e.g. "+923001234567").

import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from "@aws-sdk/client-pinpoint-sms-voice-v2";

let client: PinpointSMSVoiceV2Client | null = null;

function getClient(): PinpointSMSVoiceV2Client {
  if (client) return client;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set in the Convex deployment env.",
    );
  }

  client = new PinpointSMSVoiceV2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/** Send a plain-text alert SMS. Throws on failure — the caller decides
 * whether that failure blocks recording the notification as sent. */
export async function sendAlertSms(to: string, message: string): Promise<void> {
  const senderId = process.env.AWS_SMS_SENDER_ID;
  if (!senderId) {
    throw new Error("AWS_SMS_SENDER_ID not set in the Convex deployment env.");
  }

  const sdkClient = getClient();
  await sdkClient.send(
    new SendTextMessageCommand({
      DestinationPhoneNumber: to,
      OriginationIdentity: senderId,
      MessageBody: message,
      MessageType: "TRANSACTIONAL",
    }),
  );
}
