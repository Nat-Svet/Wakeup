import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";

export const runtime = "nodejs";

/** Admin dashboard counters. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const [
      usersCount,
      dishesActive,
      dishesTotal,
      deliveriesToday,
      paidPayments,
      pendingPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.dish.count({ where: { isActive: true } }),
      prisma.dish.count(),
      prisma.delivery.count({
        where: {
          date: {
            gte: new Date("2026-08-15T00:00:00.000Z"),
            lte: new Date("2026-08-15T00:00:00.000Z"),
          },
        },
      }),
      prisma.payment.count({ where: { status: "paid" } }),
      prisma.payment.count({ where: { status: "pending" } }),
    ]);

    const weekDeliveries = await prisma.delivery.groupBy({
      by: ["status"],
      where: {
        date: {
          gte: new Date("2026-08-15T00:00:00.000Z"),
          lte: new Date("2026-08-20T00:00:00.000Z"),
        },
      },
      _count: { _all: true },
    });

    return ok({
      usersCount,
      dishesActive,
      dishesTotal,
      deliveriesToday,
      paidPayments,
      pendingPayments,
      weekByStatus: weekDeliveries.map((row) => ({
        status: row.status,
        count: row._count._all,
      })),
    });
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to load stats", 500);
  }
}
