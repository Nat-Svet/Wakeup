import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import {
  confirmMockPayment,
  serializePayment,
} from "@/lib/checkout-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Demo payment provider confirmation.
 * In prod this would be a webhook from YooKassa/Stripe.
 */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  try {
    const result = await confirmMockPayment({
      userId: user.id,
      paymentId: id,
    });
    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    return ok({
      payment: serializePayment(result.payment),
      alreadyPaid: result.alreadyPaid,
      bonusBalance: freshUser.bonusBalance,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "PAYMENT_NOT_FOUND") {
      return fail("NOT_FOUND", "Payment not found", 404);
    }
    if (message === "INSUFFICIENT_BONUS") {
      return fail("VALIDATION_ERROR", "Недостаточно бонусов", 422);
    }
    if (message === "INVALID_STATUS") {
      return fail("VALIDATION_ERROR", "Платёж нельзя подтвердить", 422);
    }
    console.error(error);
    return fail("INTERNAL_ERROR", "Confirm failed", 500);
  }
}
