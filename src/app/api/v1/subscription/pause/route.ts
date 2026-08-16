import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializeSubscription } from "@/lib/serializers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;
  if (!user.subscription) {
    return fail("NOT_FOUND", "Subscription not found", 404);
  }

  const subscription = await prisma.subscription.update({
    where: { userId: user.id },
    data: { paused: true, active: false },
  });

  return ok(serializeSubscription(subscription));
}
