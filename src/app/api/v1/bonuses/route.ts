import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/http-auth";
import { AccrueBonusBodySchema } from "@/domain/schemas";
import { fail, fromZod, ok } from "@/lib/api-response";
import { awardBonus } from "@/lib/bonuses";
import { serializeBonus, serializeUser } from "@/lib/serializers";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error, user } = await requireUser(request);
  if (error || !user) return error!;

  const ledger = await prisma.bonusLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return ok({
    balance: user.bonusBalance,
    ledger: ledger.map(serializeBonus),
  });
}

/** Internal/demo accrual endpoint for MVP */
export async function POST(request: Request) {
  try {
    const { error, user } = await requireUser(request);
    if (error || !user) return error!;

    const body = AccrueBonusBodySchema.parse(await request.json());
    const result = await awardBonus({
      userId: user.id,
      amount: body.amount,
      reason: body.reason,
      meta: body.meta,
    });

    return ok({
      balance: result.user.bonusBalance,
      entry: serializeBonus(result.ledger),
      user: serializeUser(result.user),
    });
  } catch (error) {
    if (error instanceof ZodError) return fromZod(error);
    console.error(error);
    return fail("INTERNAL_ERROR", "Failed to accrue bonus", 500);
  }
}
