import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { UpdateTrackingBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeDelivery, serializeTracking } from "@/lib/serializers";
import { applyDeliveryStatus, ensureTracking } from "@/lib/tracking-service";
import { getCourierQuote } from "@/data/tracker";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
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

  let tracking = delivery.tracking;
  if (!tracking) {
    tracking = await ensureTracking(delivery.id, delivery.status);
    tracking = await prisma.deliveryTracking.update({
      where: { deliveryId: delivery.id },
      data: {
        courierNote: getCourierQuote(delivery.status, {
          leaveAtDoor: delivery.leaveAtDoor,
          silentPush: delivery.silentPush,
        }),
      },
    });
  }

  const freshUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
  });

  return ok({
    delivery: serializeDelivery(delivery),
    tracking: serializeTracking(tracking),
    bonusBalance: freshUser.bonusBalance,
  });
}

/** Kitchen/courier status update */
export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = UpdateTrackingBodySchema.parse(await request.json());
    const delivery = await prisma.delivery.findFirst({
      where: { id, userId: user.id },
      include: {
        items: { include: { dish: true } },
      },
    });
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

    await ensureTracking(delivery.id, delivery.status);

    let bonusAwarded = 0;
    let bonusBalance: number | null = null;
    let tracking;

    if (body.status) {
      const result = await applyDeliveryStatus({
        deliveryId: delivery.id,
        userId: user.id,
        status: body.status,
        leaveAtDoor: delivery.leaveAtDoor,
        silentPush: delivery.silentPush,
        courierNote: body.courierNote,
      });
      tracking = result.tracking;
      bonusAwarded = result.bonusAwarded;
      bonusBalance = result.bonusBalance;
    } else {
      tracking = await prisma.deliveryTracking.update({
        where: { deliveryId: delivery.id },
        data: {
          etaMinutes:
            body.etaMinutes === undefined ? undefined : body.etaMinutes,
          courierName: body.courierName,
          courierPhone: body.courierPhone,
          courierNote:
            body.courierNote === undefined ? undefined : body.courierNote,
        },
      });
    }

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
      tracking: serializeTracking(tracking),
      bonusAwarded,
      bonusBalance: bonusBalance ?? freshUser.bonusBalance,
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to update tracking", 500);
  }
}
