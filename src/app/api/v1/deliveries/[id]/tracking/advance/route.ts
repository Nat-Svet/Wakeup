import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializeDelivery, serializeTracking } from "@/lib/serializers";
import { advanceDeliveryStatus } from "@/lib/tracking-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Advance to next logistics status (demo / kitchen timer) */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const delivery = await prisma.delivery.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { dish: true } },
      tracking: true,
    },
  });
  if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

  const currentStatus = delivery.tracking?.status ?? delivery.status;
  const result = await advanceDeliveryStatus({
    deliveryId: delivery.id,
    userId: user.id,
    leaveAtDoor: delivery.leaveAtDoor,
    silentPush: delivery.silentPush,
    currentStatus,
  });

  const updated = await prisma.delivery.findUniqueOrThrow({
    where: { id },
    include: {
      items: { include: { dish: true } },
    },
  });
  const freshUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });

  return ok({
    delivery: serializeDelivery(updated),
    tracking: serializeTracking(result.tracking),
    advanced: result.advanced,
    bonusAwarded: result.bonusAwarded,
    bonusBalance: result.bonusBalance ?? freshUser.bonusBalance,
  });
}
