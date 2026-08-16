import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializePayment } from "@/lib/checkout-service";

export const runtime = "nodejs";

/** Payment history for the current user. */
export async function GET(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const deliveryId = searchParams.get("deliveryId");

  const payments = await prisma.payment.findMany({
    where: {
      userId: user.id,
      ...(deliveryId ? { deliveryId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({
    payments: payments.map(serializePayment),
  });
}
