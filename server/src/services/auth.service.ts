import {
  IActivationRequest,
  IForgotPasswordRequest,
  ILoginRequest,
  IRegistrationBody,
  IResetPasswordRequest,
  ISocialAuthBody,
} from "../interfaces/userInterface";
import authRepository from "../repositories/auth.repository";
import AppError from "../utils/AppError";
import redis, { sessionKey } from "../utils/redis";
import { sendToken } from "../utils/jwt";
import { createRegistrationChallenge, matchesRegistrationCode } from "../utils/registrationChallenge";
import { captureServerEvent } from "../utils/analytics";
import sendEmail from "../utils/SendEmail";
import { passwordRegex } from "../models/user.model";
import {
  generateResetToken,
  hashResetToken,
  RESET_COOLDOWN_MS,
  RESET_TOKEN_TTL_MS,
} from "../utils/passwordReset";


const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SOCIAL_PROVIDERS = ["google", "github"] as const;
const ACTIVATION_TTL_SECONDS = 10 * 60;
const activationKey = (token: string) => `registration:${token}`;

export const register = async (body: IRegistrationBody) => {
  const { name, email, password } = body;
  if (!name || !email || !password) {
    throw new AppError("Name, email, and password are required", 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!emailRegex.test(normalizedEmail) || !passwordRegex.test(password)) {
    throw new AppError("Invalid email or password format", 400);
  }

  const isExistingUser = await authRepository.getUserByEmail(normalizedEmail);
  if (isExistingUser) {
    throw new AppError("Email already exists", 400);
  }

  const user: IRegistrationBody = {
    name,
    email: normalizedEmail,
    password,
  };
  const { code: activationCode, token, codeHash } = createRegistrationChallenge();
  await redis.set(
    activationKey(token),
    JSON.stringify({ user, codeHash, attempts: 0 }),
    "EX",
    ACTIVATION_TTL_SECONDS,
  );

  const emailData = {
    userName: user.name,
    activationCode,
  };

  try {
    await sendEmail({
      email: user.email,
      subject: "Activate Your Account",
      template: "activation-mail.ejs",
      data: emailData,
    });
  } catch (error) {
    await redis.del(activationKey(token));
    throw error;
  }

  return token;
};

export const activateUser = async (body: IActivationRequest) => {
  const { activation_token, activation_code } = body;
  if (!/^[a-f0-9]{64}$/i.test(activation_token || "") || !/^\d{6}$/.test(activation_code || "")) {
    throw new AppError("Invalid activation details", 400);
  }
  const key = activationKey(activation_token);
  const raw = await redis.get(key);
  if (!raw) throw new AppError("Activation link is invalid or expired", 400);
  const pending = JSON.parse(raw) as { user: IRegistrationBody; codeHash: string; attempts: number };
  if (!matchesRegistrationCode(pending.codeHash, activation_code)) {
    const attempts = pending.attempts + 1;
    if (attempts >= 5) await redis.del(key);
    else await redis.set(key, JSON.stringify({ ...pending, attempts }), "KEEPTTL");
    throw new AppError("Invalid activation code", 400);
  }
  const userData = pending.user;

  // 2 check if user already exists
  const isExistingUser = await authRepository.getUserByEmail(userData.email);

  if (isExistingUser) {
    throw new AppError("Email already exists", 400);
  }
  // 3 create user
  const user = await authRepository.createUser(userData);
  await redis.del(key);
  captureServerEvent(String(user._id), "user signed up", {
    signup_method: "email",
    role: user.role,
  });
  return user;
};

export const login = async (body: ILoginRequest) => {
  const { email, password } = body;
  if (
    process.env.NODE_ENV === "production" &&
    email?.trim().toLowerCase().endsWith("@lms.test") &&
    process.env.DEMO_MODE !== "true"
  ) {
    throw new AppError("Demo accounts are disabled in production", 403);
  }

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw new AppError("Invalid Email or Password", 400);
  }

  if (user.status === "pending") {
    throw new AppError(
      "Your account is pending approval. You cannot login until your organization application is approved.",
      403,
    );
  }

  if (user.status === "suspended") {
    throw new AppError("Your account has been suspended.", 403);
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    throw new AppError("Invalid Email or Password not match", 400);
  }
  return user;
};

export const handleSocialAuth = async (body: ISocialAuthBody) => {
  const { email } = body;

  const requestedProvider =
    typeof body.provider === "string" ? body.provider.trim().toLowerCase() : "";

  const isSocialProvider = SOCIAL_PROVIDERS.includes(
    requestedProvider as (typeof SOCIAL_PROVIDERS)[number],
  );

  if (!isSocialProvider) {
    throw new AppError(
      "A valid social provider (google or github) is required",
      400,
    );
  }

  let user = await authRepository.findUserByEmail(email);

  if (!user) {
    user = await authRepository.createSocialUser(
      body,
      requestedProvider as (typeof SOCIAL_PROVIDERS)[number],
    );
  }
  const { accessToken, refreshToken } = await sendToken(user);

  return {
    user,
    accessToken,
    refreshToken,
  };
};

export const forgotPassword = async (
  body: IForgotPasswordRequest,
): Promise<void> => {
  const { email } = body;

  if (!email) {
    throw new AppError("Email is required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  const { rawToken, tokenHash } = generateResetToken();

  const now = new Date();
  const expiresAt = new Date(now.getTime() + RESET_TOKEN_TTL_MS);
  const cooldownCutoff = new Date(now.getTime() - RESET_COOLDOWN_MS);

  // atomic: only updates when the account exists (local provider) and the
  // cooldown has elapsed, so concurrent requests can never mint more than one
  const user = await authRepository.setPasswordResetToken(
    normalizedEmail,
    tokenHash,
    expiresAt,
    now,
    cooldownCutoff,
  );

  // unknown email or active cooldown -> stay silent (generic response)
  if (!user) {
    return;
  }

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Reset Your Password",
      template: "reset-password-mail.ejs",
      data: {
        userName: user.name,
        resetUrl,
      },
    });
  } catch (error) {
    // never leak delivery failures or email existence; roll back so the user
    // can retry instead of being stuck in the cooldown without a link
    console.error("Failed to send reset password email:", error);
    await authRepository.clearPasswordResetToken(tokenHash);
  }
};

export const resetPassword = async (
  body: IResetPasswordRequest,
): Promise<void> => {
  const { token, password } = body;

  if (!token) {
    throw new AppError("Reset token is required", 400);
  }

  if (!password) {
    throw new AppError("New password is required", 400);
  }

  if (!passwordRegex.test(password)) {
    throw new AppError(
      "Password must contain an uppercase letter, a lowercase letter and a number",
      400,
    );
  }

  // atomic consume: rejects invalid, expired and already-used tokens
  const user = await authRepository.consumePasswordResetToken(
    hashResetToken(token),
  );

  if (!user) {
    throw new AppError("Reset token is invalid or expired", 400);
  }

  user.password = password;

  // save() runs the shared validation + hashing hook
  await user.save();

  // the old session (with the previous password and role) must die on reset
  await redis.del(sessionKey(user._id.toString()));
};

export default {
  register,
  activateUser,
  login,
  handleSocialAuth,
  forgotPassword,
  resetPassword,
};
