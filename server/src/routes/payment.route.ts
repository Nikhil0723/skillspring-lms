import express from "express";
import { isAuthenticated } from "../middlewares/authMiddleware";
import { createPaymentOrder, razorpayWebhook, verifyPayment } from "../controllers/payment.controller";

const router = express.Router();
router.post("/create-order", isAuthenticated, createPaymentOrder);
router.post("/verify", isAuthenticated, verifyPayment);
router.post("/webhook", razorpayWebhook);
export default router;
