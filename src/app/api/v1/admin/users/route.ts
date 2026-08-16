import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializeUser } from "@/lib/serializers";

export const runtime = "nodejs";

/** Admin: list users with subscription and delivery counts. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      include: {
        subscription: true,
        _count: { select: { deliveries: true, payments: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return ok({
      users: users.map((u) => ({
        ...serializeUser(u),
        subscription: u.subscription
          ? {
              active: u.subscription.active,
              paused: u.subscription.paused,
              price: u.subscription.price,
            }
          : null,
        deliveriesCount: u._count.deliveries,
        paymentsCount: u._count.payments,
      })),
    });
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to load users", 500);
  }
}
