import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { AdminUpdateDeliveryTrackingBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeDelivery, serializeTracking } from "@/lib/serializers";
import {
  advanceDeliveryStatus,
  applyDeliveryStatus,
} from "@/lib/tracking-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function loadDelivery(id: string) {
  return prisma.delivery.findUnique({
    where: { id },
    include: {
      items: { include: { dish: true } },
      tracking: true,
    },
  });
}

/** Admin: set delivery tracking status manually. */
export async function PATCH(request: Request, context: Ctx) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await context.params;
    const body = AdminUpdateDeliveryTrackingBodySchema.parse(
      await request.json()
    );

    const delivery = await loadDelivery(id);
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

    const result = await applyDeliveryStatus({
      deliveryId: delivery.id,
      userId: delivery.userId,
      status: body.status,
      leaveAtDoor: delivery.leaveAtDoor,
      silentPush: delivery.silentPush,
    });

    const updated = await loadDelivery(id);
    if (!updated) return fail("NOT_FOUND", "Delivery not found", 404);

    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: delivery.userId },
    });

    return ok({
      delivery: serializeDelivery(updated),
      tracking: serializeTracking(result.tracking),
      bonusAwarded: result.bonusAwarded,
      bonusBalance: result.bonusBalance ?? freshUser.bonusBalance,
    });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to update tracking", 500);
  }
}

/** Admin: advance tracking one step. */
export async function POST(request: Request, context: Ctx) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await context.params;
    const delivery = await loadDelivery(id);
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

    const currentStatus = delivery.tracking?.status ?? delivery.status;
    const result = await advanceDeliveryStatus({
      deliveryId: delivery.id,
      userId: delivery.userId,
      leaveAtDoor: delivery.leaveAtDoor,
      silentPush: delivery.silentPush,
      currentStatus,
    });

    const updated = await loadDelivery(id);
    if (!updated) return fail("NOT_FOUND", "Delivery not found", 404);

    const freshUser = await prisma.user.findUniqueOrThrow({
      where: { id: delivery.userId },
    });

    return ok({
      delivery: serializeDelivery(updated),
      tracking: serializeTracking(result.tracking),
      advanced: result.advanced,
      bonusAwarded: result.bonusAwarded,
      bonusBalance: result.bonusBalance ?? freshUser.bonusBalance,
    });
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to advance tracking", 500);
  }
}
