import { createHmac, timingSafeEqual } from "crypto";
import { NextFunction, Request, Response } from "express";
import CourseModel from "../models/course.model";
import PaymentAttempt from "../models/paymentAttempt.model";
import { getRazorpay } from "../config/razorpay";
import { createOrder } from "../services/order.service";
import AppError from "../utils/AppError";
import { captureServerEvent } from "../utils/analytics";

const matchesSignature = (message: string | Buffer, signature: string, secret: string) => {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
};

const paymentMatchesAttempt = (payment: any, attempt: any) =>
  payment.order_id === attempt.razorpayOrderId &&
  payment.amount === attempt.amount &&
  payment.currency === attempt.currency &&
  payment.status === "captured";

const fulfillCapturedPayment = async (payment: any, attempt: any) => {
  if (!paymentMatchesAttempt(payment, attempt)) return false;
  const fulfillment = await createOrder(String(attempt.user), String(attempt.course), {
    id: payment.id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    payment_method: payment.method,
    created: payment.created_at,
    metadata: { razorpayOrderId: attempt.razorpayOrderId },
  });
  if (!fulfillment) {
    await PaymentAttempt.updateOne(
      { _id: attempt._id },
      { $set: { status: "needs_refund", razorpayPaymentId: payment.id } },
    );
    console.error("Duplicate captured payment requires refund:", payment.id);
    return false;
  }
  const statusUpdate = await PaymentAttempt.updateOne(
    { _id: attempt._id, status: { $nin: ["fulfilled", "needs_refund"] } },
    { $set: { status: "fulfilled", razorpayPaymentId: payment.id } },
  );
  if (statusUpdate.modifiedCount > 0) {
    captureServerEvent(String(attempt.user), "payment succeeded", {
      course_id: String(attempt.course),
      amount: payment.amount / 100,
      currency: payment.currency,
      payment_method: payment.method || "unknown",
      payment_provider: "razorpay",
    });
  }
  return true;
};

export const createPaymentOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { courseId } = req.body;
    if (!user || !courseId) {
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }
    const course = await CourseModel.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    if (course.status !== "published") {
      return res.status(400).json({ success: false, message: "Course is not available for purchase" });
    }
    if (user.courses?.some((id) => String(id) === String(course._id))) {
      return res.status(400).json({ success: false, message: "Course already purchased" });
    }
    const amount = Math.round(course.price * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) {
      return res.status(400).json({ success: false, message: "Invalid course price" });
    }
    const order = await getRazorpay().orders.create({
      amount,
      currency: "INR",
      receipt: `lms_${Date.now()}_${String(user._id).slice(-8)}`,
      notes: { courseId: String(course._id), userId: String(user._id) },
    });
    await PaymentAttempt.create({
      user: user._id, course: course._id, razorpayOrderId: order.id, amount, currency: "INR",
    });
    captureServerEvent(String(user._id), "checkout prepared", {
      course_id: String(course._id),
      amount: amount / 100,
      currency: "INR",
      payment_provider: "razorpay",
    });
    return res.status(200).json({
      success: true, keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id, amount, currency: "INR", courseName: course.name,
    });
  } catch (error: any) {
    if (error?.statusCode === 401) {
      return next(new AppError("Razorpay rejected the configured test keys. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.", 502));
    }
    next(error);
  }
};

export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string")) {
      return res.status(400).json({ success: false, message: "Missing payment details" });
    }
    const attempt = await PaymentAttempt.findOne({
      razorpayOrderId: razorpay_order_id, user: req.user?._id,
    });
    if (!attempt) return res.status(404).json({ success: false, message: "Payment order not found" });
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || !matchesSignature(`${attempt.razorpayOrderId}|${razorpay_payment_id}`, razorpay_signature, secret)) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
    if (attempt.status === "needs_refund") {
      return res.status(409).json({ success: false, message: "Duplicate payment captured. Contact support for a refund." });
    }
    if (attempt.status === "fulfilled") {
      return res.status(200).json({ success: true, enrolled: true, courseId: String(attempt.course) });
    }
    const payment = await getRazorpay().payments.fetch(razorpay_payment_id);
    if (!paymentMatchesAttempt(payment, attempt)) {
      return res.status(202).json({ success: true, enrolled: false, message: "Payment is awaiting capture" });
    }
    const fulfilled = await fulfillCapturedPayment(payment, attempt);
    if (!fulfilled) {
      return res.status(409).json({ success: false, message: "Duplicate payment captured. Contact support for a refund." });
    }
    return res.status(200).json({ success: true, enrolled: true, courseId: String(attempt.course) });
  } catch (error) { next(error); }
};

export const razorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.header("x-razorpay-signature") || "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !Buffer.isBuffer(req.body) || !matchesSignature(req.body, signature, secret)) {
    return res.status(400).json({ success: false, message: "Invalid webhook signature" });
  }
  try {
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id) {
        return res.status(400).json({ success: false, message: "Invalid payment payload" });
      }
      const attempt = await PaymentAttempt.findOne({ razorpayOrderId: payment.order_id });
      if (!attempt || !paymentMatchesAttempt(payment, attempt)) {
        return res.status(400).json({ success: false, message: "Payment does not match order" });
      }
      if (attempt.status !== "fulfilled" && attempt.status !== "needs_refund") {
        await fulfillCapturedPayment(payment, attempt);
      }
    } else if (event.event === "payment.failed") {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id) {
        const attempt = await PaymentAttempt.findOne({ razorpayOrderId: payment.order_id });
        if (attempt && attempt.status === "created") {
          await PaymentAttempt.updateOne({ _id: attempt._id }, { $set: { status: "failed" } });
          captureServerEvent(String(attempt.user), "payment failed", {
            course_id: String(attempt.course),
            amount: attempt.amount / 100,
            currency: attempt.currency,
            error_code: payment.error_code || "unknown",
            error_source: payment.error_source || "unknown",
            payment_provider: "razorpay",
          });
        }
      }
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing failed:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
};
