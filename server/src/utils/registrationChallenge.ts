import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";

export const createRegistrationChallenge = () => {
  const code = String(randomInt(100000, 1000000));
  const token = randomBytes(32).toString("hex");
  return { code, token, codeHash: hashRegistrationCode(code) };
};

export const hashRegistrationCode = (code: string) =>
  createHash("sha256").update(code).digest("hex");

export const matchesRegistrationCode = (hash: string, code: string) => {
  if (!/^[a-f0-9]{64}$/i.test(hash)) return false;
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashRegistrationCode(code), "hex"));
};
