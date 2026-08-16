import { ZodError } from "zod";
import { requireUser } from "@/lib/http-auth";
import { CheckoutBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import {
  createCheckout,
  serializePayment,
} from "@/lib/checkout-service";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Create (or reuse) a pending checkout for a delivery day. */
export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = CheckoutBodySchema.parse(await request.json());
    const result = await createCheckout({
      userId: user.id,
      deliveryId: body.deliveryId,
      bonusToSpend: body.bonusToSpend,
      idempotencyKey: body.idempotencyKey,
    });

    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    return ok({
      payment: serializePayment(result.payment),
      reused: result.reused,
      bonusBalance: freshUser.bonusBalance,
      mockConfirmHint:
        "POST /api/v1/payments/:id/confirm — демо-подтверждение оплаты",
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const map: Record<string, [string, number]> = {
      DELIVERY_NOT_FOUND: ["Delivery not found", 404],
      PENDING_KIDS_QTY: [
        "Укажи количество детских позиций перед оплатой",
        422,
      ],
      EMPTY_ORDER: ["Заказ пуст — нечего оплачивать", 422],
      ALREADY_PAID: ["Этот заказ уже оплачен", 409],
      IDEMPOTENCY_CONFLICT: ["Idempotency key belongs to another user", 409],
    };
    const mapped = map[message];
    if (mapped) return fail("VALIDATION_ERROR", mapped[0], mapped[1]);
    console.error(error);
    return fail(
      "INTERNAL_ERROR",
      "Оплата временно недоступна. Перезапусти сервер и попробуй снова.",
      500,
      { reason: message }
    );
  }
}
