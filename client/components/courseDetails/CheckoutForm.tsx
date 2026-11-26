"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { createPaymentOrder } from "@/lib/api/createPaymentOrder";
import { verifyPayment } from "@/lib/api/verifyPayment";
import { loadRazorpayCheckout } from "@/lib/razorpay";
import { captureEvent } from "@/lib/analytics";

export default function CheckoutForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePayment = async () => {
    setIsLoading(true);
    setMessage(null);
    captureEvent("checkout started", { course_id: courseId, payment_provider: "razorpay" });
    try {
      await loadRazorpayCheckout();
      const order = await createPaymentOrder(courseId);
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "SkillSpring",
        description: order.courseName,
        handler: async (payment) => {
          try {
            const result = await verifyPayment(payment);
            if (result.enrolled) {
              captureEvent("checkout completed", { course_id: courseId, payment_provider: "razorpay" });
              router.push(`/user/access-course/${courseId}`);
            } else {
              setMessage(result.message || "Payment received. Enrollment is being confirmed.");
            }
          } catch (error) {
            captureEvent("payment verification failed", { course_id: courseId, payment_provider: "razorpay" });
            setMessage(error instanceof Error ? error.message : "Payment verification failed");
          } finally {
            setIsLoading(false);
          }
        },
        modal: { ondismiss: () => setIsLoading(false) },
      });
      checkout.on("payment.failed", (response) => {
        captureEvent("payment failed", {
          course_id: courseId,
          payment_provider: "razorpay",
          error_type: "razorpay_payment_failed",
        });
        setMessage(response.error?.description || "Payment failed. Please try again.");
        setIsLoading(false);
      });
      checkout.open();
    } catch (error) {
      captureEvent("checkout failed to start", { course_id: courseId, payment_provider: "razorpay" });
      setMessage(error instanceof Error ? error.message : "Could not start checkout");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pay securely with Razorpay. Your enrollment starts after payment is verified.
      </p>
      {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
      <Button type="button" onClick={handlePayment} disabled={isLoading} className="w-full">
        {isLoading ? "Processing..." : "Continue to payment"}
      </Button>
    </div>
  );
}
