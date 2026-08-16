import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { serializeDish } from "@/lib/serializers";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dishes = await prisma.dish.findMany({
      where: { isActive: true },
      orderBy: [{ isKids: "asc" }, { name: "asc" }],
    });
    return ok(dishes.map(serializeDish));
  } catch (error) {
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to load dishes", 500);
  }
}
