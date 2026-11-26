import mongoose, { Schema } from "mongoose";

const paymentAttemptSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ["created", "fulfilled", "failed", "needs_refund"],
      default: "created",
    },
  },
  { timestamps: true },
);

export default mongoose.model("PaymentAttempt", paymentAttemptSchema);
