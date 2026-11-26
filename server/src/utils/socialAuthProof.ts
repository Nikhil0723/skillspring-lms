import { createHmac, timingSafeEqual } from "crypto";

export const validSocialAuthProof = (
  body: unknown,
  timestamp: string,
  nonce: string,
  signature: string,
  secret: string | undefined,
  now = Date.now(),
) => {
  const issuedAt = Number(timestamp);
  if (
    !secret ||
    !/^\d{13}$/.test(timestamp) ||
    !/^[a-f0-9-]{36}$/i.test(nonce) ||
    !/^[a-f0-9]{64}$/i.test(signature) ||
    !Number.isFinite(issuedAt) ||
    Math.abs(now - issuedAt) > 60_000
  ) return false;

  const message = `${timestamp}.${nonce}.${JSON.stringify(body)}`;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
};
