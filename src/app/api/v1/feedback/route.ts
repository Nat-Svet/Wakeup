import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { CreateFeedbackBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { awardBonus } from "@/lib/bonuses";
import { serializeFeedback, serializeUser } from "@/lib/serializers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = CreateFeedbackBodySchema.parse(await request.json());
    const delivery = await prisma.delivery.findFirst({
      where: { id: body.deliveryId, userId: user.id },
      include: { feedback: true },
    });
    if (!delivery) return fail("NOT_FOUND", "Delivery not found", 404);
    if (delivery.feedback) {
      return fail("ALREADY_EXISTS", "Feedback already submitted", 409);
    }

    const positive = body.rating >= 4;
    const bonusAwarded = positive ? 15 : 50;
    const kind = positive ? "positive" : "negative";

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        deliveryId: delivery.id,
        rating: body.rating,
        kind,
        tags: body.tags,
        comment: body.comment ?? null,
        bonusAwarded,
      },
    });

    const bonus = await awardBonus({
      userId: user.id,
      amount: bonusAwarded,
      reason: positive ? "feedback_positive" : "feedback_compensation",
      meta: { deliveryId: delivery.id, rating: body.rating },
    });

    return ok({
      feedback: serializeFeedback(feedback),
      bonusAwarded,
      user: serializeUser(bonus.user),
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to submit feedback", 500);
  }
}
