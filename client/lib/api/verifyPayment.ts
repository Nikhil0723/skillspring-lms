import { apiClient } from "./apiClient";
import { RazorpayCheckoutResponse, ResponseVerifyPayment } from "@/types/order.type";

export const verifyPayment = async (payment: RazorpayCheckoutResponse): Promise<ResponseVerifyPayment> => {
  const response = await apiClient("/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payment),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not verify payment");
  return data;
};
