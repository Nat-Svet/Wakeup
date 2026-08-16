import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import {
  parseDateOnly,
  serializeDelivery,
  startOfUtcDay,
} from "@/lib/serializers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");

  const from = fromRaw ? parseDateOnly(fromRaw) : null;
  const to = toRaw ? parseDateOnly(toRaw) : null;
  if ((fromRaw && !from) || (toRaw && !to)) {
    return fail("VALIDATION_ERROR", "from/to must be YYYY-MM-DD", 422);
  }

  const deliveries = await prisma.delivery.findMany({
    where: {
      userId: user.id,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: startOfUtcDay(from) } : {}),
              ...(to ? { lte: startOfUtcDay(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      items: { include: { dish: true } },
    },
    orderBy: { date: "asc" },
  });

  return ok(deliveries.map(serializeDelivery));
}
