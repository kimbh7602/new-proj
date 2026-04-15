import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

export function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!signature || !WEBHOOK_SECRET) return false;

  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  const sig = signature.replace("sha256=", "");

  if (sig.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
