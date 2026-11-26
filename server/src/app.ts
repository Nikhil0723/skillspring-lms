import express, { NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { globalErrorHandler } from "./middlewares/GlobalErrorHandler";
import { swaggerDocument } from "./docs/swagger";

import authRouter from "./routes/auth.route";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import layoutRouter from "./routes/layout.route";
import categoryRouter from "./routes/category.route";
import PaymentRouter from "./routes/payment.route";
import certificateRouter from "./routes/certificate.route";
import instructorApplicationRouter from "./routes/instructorApplication.route";
import organizationRouter from "./routes/organization.route";
import vdocipherRouter from "./routes/vdocipher.route";
import ticketRouter from "./routes/ticket.route";
import analyticsRouter from "./routes/analytics.route";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

export const app = express();

// Query parser
app.set("query parser", "extended");

// Account for forwarded client addresses when deployed behind a proxy.
app.set("trust proxy", 1);

// CORS
const envOrigins = (process.env.ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true; // non-browser / same-origin requests
  if (envOrigins.includes(origin)) return true;

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
    credentials: true,
  }),
);

// Rate Limiting
const limit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
});

app.use(limit);

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Try again later." },
});
app.use(
  [
    "/api/v1/auth/login-user",
    "/api/v1/auth/demo-login",
    "/api/v1/auth/registration",
    "/api/v1/auth/activate-user",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
  ],
  authLimit,
);

// Razorpay webhooks need the original bytes for HMAC verification.
// This route must receive the raw request body before express.json()
app.use(
  "/api/v1/payment/webhook",
  express.raw({
    type: "application/json",
  }),
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/layouts", layoutRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/payment", PaymentRouter);
app.use("/api/v1/certificates", certificateRouter);
app.use("/api/v1/instructor-applications", instructorApplicationRouter);
app.use("/api/v1/organizations", organizationRouter); 
app.use("/api/v1/vdocipher", vdocipherRouter);
app.use("/api/v1/tickets", ticketRouter);
app.use("/api/v1/analytics", analyticsRouter);

// API documentation (Swagger UI)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 - Route not found

app.all(/.*/, (req: Request, res: Response) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global Error Handler MUST be the last middleware.

app.use(globalErrorHandler);
