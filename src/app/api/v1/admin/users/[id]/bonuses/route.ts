import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/http-auth";
import { AdminAdjustBonusBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { serializeBonus, serializeUser } from "@/lib/serializers";
import { awardBonus } from "@/lib/bonuses";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Admin: manual bonus adjust (positive or negative). */
export async function POST(request: Request, context: Ctx) {
  try {
    const { error, user: admin } = await requireAdmin(request);
    if (error || !admin) return error!;

    const { id } = await context.params;
    const body = AdminAdjustBonusBodySchema.parse(await request.json());
    if (body.amount === 0) {
      return fail("VALIDATION_ERROR", "Amount must be non-zero", 422);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return fail("NOT_FOUND", "User not found", 404);

    if (body.amount < 0 && target.bonusBalance + body.amount < 0) {
      return fail("INSUFFICIENT_BONUS", "Balance would go negative", 400);
    }

    const result = await awardBonus({
      userId: id,
      amount: body.amount,
      reason: "manual_adjust",
      meta: {
        note: body.note ?? null,
        adminId: admin.id,
      },
    });

    return ok({
      user: serializeUser(result.user),
      ledger: result.ledger ? serializeBonus(result.ledger) : null,
    });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    console.error(err);
    return fail("INTERNAL_ERROR", "Failed to adjust bonus", 500);
  }
}
