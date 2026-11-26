import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createRegistrationChallenge, matchesRegistrationCode } from "../utils/registrationChallenge";
import { validSocialAuthProof } from "../utils/socialAuthProof";

test("social sign-in proof rejects impersonation and stale requests", () => {
  const secret = "a-private-test-secret";
  const body = { email: "student@example.com", provider: "google", name: "Student" };
  const timestamp = String(Date.now());
  const nonce = randomUUID();
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${JSON.stringify(body)}`)
    .digest("hex");

  assert.equal(validSocialAuthProof(body, timestamp, nonce, signature, secret), true);
  assert.equal(validSocialAuthProof({ ...body, email: "admin@example.com" }, timestamp, nonce, signature, secret), false);
  assert.equal(validSocialAuthProof(body, timestamp, nonce, signature, "wrong-secret"), false);
  assert.equal(validSocialAuthProof(body, timestamp, nonce, signature, secret, Number(timestamp) + 60_001), false);
});

test("registration token is opaque and a guessed code does not verify", () => {
  const { code, token, codeHash } = createRegistrationChallenge();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(token.includes(code), false);
  assert.equal(matchesRegistrationCode(codeHash, code), true);
  assert.equal(matchesRegistrationCode(codeHash, code === "000000" ? "000001" : "000000"), false);
});
