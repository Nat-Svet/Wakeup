import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail } from "@/lib/api-response";
import { formatUserAddress } from "@/lib/serializers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatRub(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

/** Downloadable HTML receipt for a paid payment. */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const payment = await prisma.payment.findFirst({
    where: { id, userId: user.id },
    include: {
      delivery: {
        include: { items: { include: { dish: true } } },
      },
    },
  });
  if (!payment) return fail("NOT_FOUND", "Payment not found", 404);
  if (payment.status !== "paid") {
    return fail("VALIDATION_ERROR", "Чек доступен только после оплаты", 422);
  }

  const date = payment.delivery.date.toISOString().slice(0, 10);
  const lines = payment.delivery.items
    .filter((item) => item.quantity > 0)
    .map((item) => {
      const sum = item.dish.price * item.quantity;
      return `<tr>
        <td>${escapeHtml(item.dish.name)}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${formatRub(item.dish.price)}</td>
        <td style="text-align:right">${formatRub(sum)}</td>
      </tr>`;
    })
    .join("");

  const paidAt = payment.paidAt
    ? payment.paidAt.toLocaleString("ru-RU")
    : "—";
  const code = payment.receiptCode ?? payment.id;

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Чек ${escapeHtml(code)} — Просыпайся!</title>
  <style>
    body { font-family: Georgia, serif; color: #3D2B22; max-width: 560px; margin: 32px auto; padding: 0 16px; }
    h1 { font-size: 28px; margin: 0 0 4px; }
    .muted { color: #8B6B5A; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px 4px; border-bottom: 1px solid #EBE4DA; font-size: 14px; }
    th { text-align: left; color: #A67C68; font-size: 12px; text-transform: uppercase; }
    .total { margin-top: 16px; padding: 12px; background: #F7F0E6; border-radius: 12px; }
    .row { display: flex; justify-content: space-between; margin: 6px 0; }
    .strong { font-weight: 700; font-size: 18px; }
  </style>
</head>
<body>
  <h1>Просыпайся!</h1>
  <p class="muted">Чек оплаты · Просыпайся!</p>
  <p><strong>№ ${escapeHtml(code)}</strong></p>
  <p class="muted">Дата оплаты: ${escapeHtml(paidAt)}</p>
  <p class="muted">Доставка: ${escapeHtml(date)} · слот ${escapeHtml(payment.delivery.timeSlot)}</p>
  <p class="muted">Покупатель: ${escapeHtml(user.name)} · ${escapeHtml(formatUserAddress(user))}</p>
  <table>
    <thead>
      <tr><th>Позиция</th><th style="text-align:center">Кол-во</th><th style="text-align:right">Цена</th><th style="text-align:right">Сумма</th></tr>
    </thead>
    <tbody>${lines}</tbody>
  </table>
  <div class="total">
    <div class="row"><span>Итого позиций</span><span>${formatRub(payment.itemsTotal)}</span></div>
    <div class="row"><span>Списано бонусов</span><span>−${formatRub(payment.bonusSpent)}</span></div>
    <div class="row strong"><span>Оплачено картой</span><span>${formatRub(payment.amountPaid)}</span></div>
  </div>
  <p class="muted" style="margin-top:24px">Демо-чек «Просыпайся!» · провайдер ${escapeHtml(payment.provider)}</p>
</body>
</html>`;

  const filename = `prosyvaisya-check-${code}.html`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
