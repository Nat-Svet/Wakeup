import { apiClient } from "@/lib/api-client";

/** Загрузить HTML-текст чека оплаты (`/payments/:id/receipt`). */
export async function fetchReceiptHtml(token: string, paymentId: string) {
  const { blob } = await apiClient.downloadReceipt(token, paymentId);
  return blob.text();
}
