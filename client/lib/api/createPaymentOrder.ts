import { apiClient } from "./apiClient";
import { ResponseCreatePaymentOrder } from "@/types/order.type";

export const createPaymentOrder = async (courseId: string): Promise<ResponseCreatePaymentOrder> => {
  const response = await apiClient("/payment/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not prepare payment");
  return data;
};
