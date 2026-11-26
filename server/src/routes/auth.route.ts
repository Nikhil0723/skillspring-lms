import express from "express";
import {
  activateUser,
  demoLogin,
  forgotPassword,
  login,
  logout,
  refreshAccessToken,
  registrationUser,
  resetPassword,
  socialAuth,
} from "../controllers/auth.controller";
import {isAuthenticated } from "../middlewares/authMiddleware";
import { verifySocialAuthBridge } from "../middlewares/socialAuthBridge";
const router = express.Router();

router.route("/registration").post(registrationUser);
router.route("/activate-user").post(activateUser);
router.route("/login-user").post(login);
router.post("/demo-login", demoLogin);
router.get("/logout-user", isAuthenticated, logout);
router.get("/refresh-token", refreshAccessToken);
router.post("/social-auth", verifySocialAuthBridge, socialAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword); 



export default router;
