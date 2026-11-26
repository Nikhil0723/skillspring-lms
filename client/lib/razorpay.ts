import { RazorpayCheckoutResponse } from "@/types/order.type";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

export const loadRazorpayCheckout = async () => {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("razorpay-checkout") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Razorpay checkout could not load")), { once: true });
    if (!existing) {
      script.id = "razorpay-checkout";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(script);
    }
  });
  if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable");
};
