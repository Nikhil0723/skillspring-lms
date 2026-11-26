import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { IUser } from "../interfaces/userInterface";
import AppError from "./AppError";
import redis, { sanitizeUser, sessionKey } from "./redis";
import { StringValue } from "ms";

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

export const accessExpireMin = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE as string,
);
export const refreshExpireDays = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE as string,
);

// cookies config
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  process.env.VERCEL === "1";

export const accessCookieOptions = (): ITokenOptions => ({
  expires: new Date(Date.now() + accessExpireMin * 60 * 1000),
  maxAge: accessExpireMin * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
});

export const refreshCookieOptions = (): ITokenOptions => ({
  expires: new Date(Date.now() + refreshExpireDays * 24 * 60 * 60 * 1000),
  maxAge: refreshExpireDays * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
});

export const clearCookieOptions = (): ITokenOptions => ({
  expires: new Date(Date.now()),
  maxAge: 1,
  httpOnly: true,
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
});

// SEND TOKENS
export const sendToken = async (user: IUser) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // clean session
  await redis.set(
    sessionKey(user._id.toString()),
    JSON.stringify(sanitizeUser(user)),
    "EX",
    refreshExpireDays * 24 * 60 * 60,
  );

  return { accessToken, refreshToken };
};

// REFRESH FLOW
export const handleRefreshAccessToken = async (token: string) => {
  if (!token) throw new AppError("Refresh token required", 400);

  let decoded: JwtPayload & { id: string };

  try {
    decoded = jwt.verify(
      token,
      process.env.REFRESH_TOKEN_SECRET as Secret,
    ) as any;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await redis.get(sessionKey(decoded.id));

  if (!session) {
    throw new AppError("Session expired", 401);
  }

  const user = JSON.parse(session);
  const userId = user._id?.toString() ?? user.id;

  const accessToken = jwt.sign(
    { id: userId, role: user.role },
    process.env.ACCESS_TOKEN_SECRET as Secret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRE as StringValue },
  );

  const newRefreshToken = jwt.sign(
    { id: userId, role: user.role },
    process.env.REFRESH_TOKEN_SECRET as Secret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRE as StringValue },
  );

  await redis.set(
    sessionKey(userId),
    JSON.stringify(sanitizeUser(user)),
    "EX",
    refreshExpireDays * 24 * 60 * 60,
  );

  return { accessToken, newRefreshToken };
};
