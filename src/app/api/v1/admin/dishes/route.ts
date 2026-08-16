import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { AdminCreateDishBodySchema } from "@/domain/schemas";
import { created, fail, fromZod, ok } from "@/lib/api-response";
import { serializeDish } from "@/lib/serializers";

export const runtime = "nodejs";

/** Admin: list all dishes (including inactive). */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const dishes = await prisma.dish.findMany({
      orderBy: [{ isActive: "desc" }, { isKids: "asc" }, { name: "asc" }],
    });
    return ok(dishes.map(serializeDish));
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to load dishes", 500);
  }
}

/** Admin: create dish. */
export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin(request);
    if (error) return error;

    const body = AdminCreateDishBodySchema.parse(await request.json());
    const existing = await prisma.dish.findUnique({ where: { slug: body.slug } });
    if (existing) {
      return fail("CONFLICT", "Dish with this slug already exists", 409);
    }

    const dish = await prisma.dish.create({ data: body });
    return created(serializeDish(dish));
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to create dish", 500);
  }
}
