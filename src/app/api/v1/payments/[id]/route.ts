import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializePayment } from "@/lib/checkout-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const payment = await prisma.payment.findFirst({
    where: { id, userId: user.id },
  });
  if (!payment) return fail("NOT_FOUND", "Payment not found", 404);

  return ok({ payment: serializePayment(payment) });
}
