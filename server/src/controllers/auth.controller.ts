import { NextFunction, Request, Response } from "express";
import authService from "../services/auth.service";
import {
  accessCookieOptions,
  clearCookieOptions,
  handleRefreshAccessToken,
  refreshCookieOptions,
  sendToken,
} from "../utils/jwt";
import redis, { sanitizeUser, sessionKey } from "../utils/redis";
import UserModel from "../models/user.model";

export const registrationUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const verificationToken = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Check your email to verify your account",
      verificationToken,
    });
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await authService.activateUser(req.body);
    res.status(201).json({
      success: true,
      message: "Email Activation successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = await authService.login(req.body);

    const { accessToken, refreshToken } = await sendToken(user);
    const { password, ...userWithoutPassword } = user.toObject();

    res.cookie("access_token", accessToken, accessCookieOptions());
    res.cookie("refresh_token", refreshToken, refreshCookieOptions());
    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const demoLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (process.env.DEMO_MODE !== "true") {
      return res.status(404).json({ success: false, message: "Demo login is unavailable" });
    }
    const demoEmails: Record<string, string> = {
      user: "demo.student@lms.test",
      instructor: "demo.instructor@lms.test",
      admin: "demo.admin@lms.test",
    };
    const role = req.body?.role;
    const email = typeof role === "string" ? demoEmails[role] : undefined;
    if (!email) return res.status(400).json({ success: false, message: "Invalid demo role" });
    const user = await UserModel.findOne({ email, role, status: "active", isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: "Demo account not found" });
    const { accessToken, refreshToken } = await sendToken(user);
    res.cookie("access_token", accessToken, accessCookieOptions());
    res.cookie("refresh_token", refreshToken, refreshCookieOptions());
    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await authService.forgotPassword(req.body);

    res.status(200).json({
      success: true,
      message:
        "If that email address is registered, a password reset link has been sent to it.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await authService.resetPassword(req.body);

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.cookie("access_token", "", clearCookieOptions());
    res.cookie("refresh_token", "", clearCookieOptions());
    const userId = req.user?._id.toString() || "";
    await redis.del(sessionKey(userId));
    res.status(200).json({
      success: true,
      message: "logout successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const oldRefreshToken = req.cookies.refresh_token;
    const { accessToken, newRefreshToken } =
      await handleRefreshAccessToken(oldRefreshToken);

    res.cookie("access_token", accessToken, accessCookieOptions());

    res.cookie("refresh_token", newRefreshToken, refreshCookieOptions());

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    next(err);
  }
};

export const socialAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user, accessToken, refreshToken } =
      await authService.handleSocialAuth(req.body);

    res.status(200).json({
      user,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};
