import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { UpdateDeliveryBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeDelivery } from "@/lib/serializers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = UpdateDeliveryBodySchema.parse(await request.json());
    const existing = await prisma.delivery.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return fail("NOT_FOUND", "Delivery not found", 404);

    const delivery = await prisma.delivery.update({
      where: { id },
      data: {
        timeSlot: body.timeSlot,
        leaveAtDoor: body.leaveAtDoor,
        silentPush: body.silentPush,
      },
      include: {
        items: { include: { dish: true } },
      },
    });

    return ok(serializeDelivery(delivery));
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to update delivery", 500);
  }
}
