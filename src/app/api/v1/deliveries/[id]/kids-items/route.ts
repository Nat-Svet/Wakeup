import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { CreateKidsItemBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { awardBonus, KIDS_SHAPE_TO_SLUG } from "@/lib/bonuses";
import { serializeDelivery } from "@/lib/serializers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = CreateKidsItemBodySchema.parse(await request.json());
    const delivery = await prisma.delivery.findFirst({
      where: { id, userId: user.id },
      include: {
        items: { include: { dish: true } },
      },
    });
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

    const slug = KIDS_SHAPE_TO_SLUG[body.shape];
    const dish = await prisma.dish.findUnique({ where: { slug } });
    if (!dish) return fail("NOT_FOUND", "Kids dish not found", 404);

    const existing = delivery.items.find(
      (item) =>
        item.dishId === dish.id &&
        item.shape === body.shape &&
        item.glaze === body.glaze &&
        item.filling === body.filling
    );

    if (!existing) {
      await prisma.deliveryItem.create({
        data: {
          deliveryId: id,
          dishId: dish.id,
          quantity: 0,
          shape: body.shape,
          glaze: body.glaze,
          filling: body.filling,
        },
      });

      await awardBonus({
        userId: user.id,
        amount: 20,
        reason: "kids_construction",
        meta: { deliveryId: id, shape: body.shape },
      });
    }

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
    return fail("INTERNAL_ERROR", "Failed to add kids item", 500);
  }
}
