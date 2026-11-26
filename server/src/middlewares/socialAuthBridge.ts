import { NextFunction, Request, Response } from "express";
import redis from "../utils/redis";
import { validSocialAuthProof } from "../utils/socialAuthProof";

export const verifySocialAuthBridge = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const secret = process.env.SOCIAL_AUTH_BRIDGE_SECRET;
    const timestamp = req.header("x-social-timestamp") || "";
    const nonce = req.header("x-social-nonce") || "";
    const signature = req.header("x-social-signature") || "";
    if (!validSocialAuthProof(req.body, timestamp, nonce, signature, secret)) {
      return res.status(401).json({ success: false, message: "Invalid social authentication proof" });
    }

    const accepted = await redis.set(`social-auth-nonce:${nonce}`, "1", "EX", 120, "NX");
    if (accepted !== "OK") {
      return res.status(401).json({ success: false, message: "Social authentication proof already used" });
    }
    next();
  } catch (error) {
    next(error);
  }
};
