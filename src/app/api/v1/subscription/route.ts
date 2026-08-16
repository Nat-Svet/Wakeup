import { requireUser } from "@/lib/http-auth";
import { fail, ok } from "@/lib/api-response";
import { serializeSubscription } from "@/lib/serializers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  if (!user.subscription) {
    return fail("NOT_FOUND", "Subscription not found", 404);
  }

  return ok(serializeSubscription(user.subscription));
}
