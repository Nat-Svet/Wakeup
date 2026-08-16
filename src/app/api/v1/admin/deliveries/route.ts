import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { DeliveryStatusSchema } from "@/domain/schemas";
import { fail, ok } from "@/lib/api-response";
import { serializeDelivery, serializeUser } from "@/lib/serializers";
import { serializePayment } from "@/lib/checkout-service";

export const runtime = "nodejs";

function parseDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Admin: list deliveries with user, items, tracking, latest payment. */
export async function GET(request: Request) {
  const { error } = await requireAdmin(request);
  if (error) return error;

  try {
    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));
    const statusRaw = url.searchParams.get("status");
    const status = statusRaw
      ? DeliveryStatusSchema.safeParse(statusRaw)
      : null;

    if (statusRaw && status && !status.success) {
      return fail("VALIDATION_ERROR", "Invalid status filter", 422);
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(status?.success ? { status: status.data } : {}),
      },
      include: {
        user: true,
        items: { include: { dish: true } },
        tracking: true,
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: 200,
    });

    return ok({
      deliveries: deliveries.map((d) => ({
        ...serializeDelivery(d),
        user: serializeUser(d.user),
        payment: d.payments[0] ? serializePayment(d.payments[0]) : null,
        tracking: d.tracking
          ? {
              deliveryId: d.tracking.deliveryId,
              status: d.tracking.status,
              etaMinutes: d.tracking.etaMinutes,
              courierName: d.tracking.courierName,
              courierPhone: d.tracking.courierPhone,
              courierNote: d.tracking.courierNote,
              neighborBonusAwarded: d.tracking.neighborBonusAwarded,
            }
          : null,
      })),
    });
  } catch (err) {
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to load deliveries", 500);
  }
}
