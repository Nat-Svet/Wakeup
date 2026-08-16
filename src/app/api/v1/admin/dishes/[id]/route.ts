import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { AdminUpdateDishBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeDish } from "@/lib/serializers";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: update dish. */
export async function PATCH(request: Request, context: Ctx) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await context.params;
    const body = AdminUpdateDishBodySchema.parse(await request.json());

    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "Dish not found", 404);

    if (body.slug && body.slug !== existing.slug) {
      const clash = await prisma.dish.findUnique({ where: { slug: body.slug } });
      if (clash) {
        return fail("CONFLICT", "Dish with this slug already exists", 409);
      }
    }

    const dish = await prisma.dish.update({ where: { id }, data: body });
    return ok(serializeDish(dish));
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to update dish", 500);
  }
}

/** Admin: soft-delete dish (isActive=false). */
export async function DELETE(request: Request, context: Ctx) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const { id } = await context.params;
    const existing = await prisma.dish.findUnique({ where: { id } });
    if (!existing) return fail("NOT_FOUND", "Dish not found", 404);

    const dish = await prisma.dish.update({
      where: { id },
      data: { isActive: false },
    });
    return ok(serializeDish(dish));
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to deactivate dish", 500);
  }
}
