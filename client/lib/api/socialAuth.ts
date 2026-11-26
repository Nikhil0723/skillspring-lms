import "server-only";
import { createHmac, randomUUID } from "crypto";

interface SocialAuthBody {
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export const socialAuth = async (body: SocialAuthBody) => {
  const serverURI = process.env.SERVER_URI || process.env.NEXT_PUBLIC_SERVER_URI;
  const secret = process.env.SOCIAL_AUTH_BRIDGE_SECRET;
  if (!serverURI || !secret) {
    throw new Error("Social authentication bridge is not configured");
  }
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const payload = JSON.stringify(body);
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${payload}`)
    .digest("hex");
  const res = await fetch(`${serverURI}/auth/social-auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-social-timestamp": timestamp,
      "x-social-nonce": nonce,
      "x-social-signature": signature,
    },
    body: payload,
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Social authentication failed");
  }
  return result;
};
