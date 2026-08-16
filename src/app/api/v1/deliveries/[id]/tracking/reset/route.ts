import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializeDelivery, serializeTracking } from "@/lib/serializers";
import { resetDeliveryTracking } from "@/lib/tracking-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Reset tracker demo back to mixing */
export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const delivery = await prisma.delivery.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { dish: true } },
    },
  });
  if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

  const result = await resetDeliveryTracking({
    deliveryId: delivery.id,
    userId: user.id,
    leaveAtDoor: delivery.leaveAtDoor,
    silentPush: delivery.silentPush,
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
    bonusBalance: freshUser.bonusBalance,
  });
}
