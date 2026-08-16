import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail } from "@/lib/api-response";
import { serializeDelivery, serializeTracking } from "@/lib/serializers";
import { ensureTracking } from "@/lib/tracking-service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Server-Sent Events stream for live tracking.
 * Polls DB every 2s and emits when status/note/eta changes.
 */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const delivery = await prisma.delivery.findFirst({
    where: { id, userId: user.id },
  });
  if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);

  const encoder = new TextEncoder();
  let lastFingerprint = "";
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send("ready", { deliveryId: id });

      const tick = async () => {
        if (closed) return;
        try {
          const current = await prisma.delivery.findFirst({
            where: { id, userId: user.id },
            include: {
            items: { include: { dish: true } },
            tracking: true,
          },
          });
          if (!current) {
            send("error", { message: "Delivery not found" });
            controller.close();
            return;
          }

          let tracking = current.tracking;
          if (!tracking) {
            tracking = await ensureTracking(current.id, current.status);
          }

          const fingerprint = [
            tracking.status,
            tracking.etaMinutes,
            tracking.courierNote,
            tracking.neighborBonusAwarded,
          ].join("|");

          if (fingerprint !== lastFingerprint) {
            lastFingerprint = fingerprint;
            const freshUser = await prisma.user.findUniqueOrThrow({
              where: { id: user.id },
            });
            send("tracking", {
              delivery: serializeDelivery(current),
              tracking: serializeTracking(tracking),
              bonusBalance: freshUser.bonusBalance,
            });
          }
        } catch (err) {
          console.error(err);
          send("error", { message: "Stream tick failed" });
        }
      };

      await tick();
      const interval = setInterval(() => {
        void tick();
      }, 2000);

      const onAbort = () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      request.signal.addEventListener("abort", onAbort);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
