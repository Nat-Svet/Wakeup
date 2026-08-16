import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { UpsertDeliveryItemsBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeDelivery } from "@/lib/serializers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Full replace of delivery items (adult + kids constructions). */
export async function PUT(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = UpsertDeliveryItemsBodySchema.parse(await request.json());
    const delivery = await prisma.delivery.findFirst({
      where: { id, userId: user.id },
    });
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

    const dishIds = body.items.map((item) => item.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds }, isActive: true },
    });
    if (dishes.length !== new Set(dishIds).size) {
      return fail("VALIDATION_ERROR", "One or more dishes are invalid", 422);
    }

    const rows = body.items.filter(
      (item) => item.kidsCustom || item.quantity > 0
    );

    await prisma.$transaction(async (tx) => {
      await tx.deliveryItem.deleteMany({ where: { deliveryId: id } });
      if (rows.length === 0) return;
      await tx.deliveryItem.createMany({
        data: rows.map((item) => ({
          deliveryId: id,
          dishId: item.dishId,
          quantity: item.quantity,
          shape: item.kidsCustom?.shape ?? null,
          glaze: item.kidsCustom?.glaze ?? null,
          filling: item.kidsCustom?.filling ?? null,
        })),
      });
    });

    const updated = await prisma.delivery.findUniqueOrThrow({
      where: { id },
      include: {
        items: { include: { dish: true } },
      },
    });

    return ok(serializeDelivery(updated));
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to update delivery items", 500);
  }
}
