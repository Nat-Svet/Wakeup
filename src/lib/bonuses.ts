import type { BonusReason, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function awardBonus(params: {
  userId: string;
  amount: number;
  reason: BonusReason;
  meta?: Prisma.InputJsonValue;
}) {
  if (params.amount === 0) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: params.userId },
    });
    return { ledger: null, user };
  }

  const [ledger, user] = await prisma.$transaction([
    prisma.bonusLedger.create({
      data: {
        userId: params.userId,
        amount: params.amount,
        reason: params.reason,
        meta: params.meta,
      },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { bonusBalance: { increment: params.amount } },
    }),
  ]);

  return { ledger, user };
}

/** Списание бонусов (amount > 0). Пишет отрицательную запись order_spend. */
export async function spendBonus(params: {
  userId: string;
  amount: number;
  meta?: Prisma.InputJsonValue;
}) {
  if (params.amount <= 0) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: params.userId },
    });
    return { ledger: null, user };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
  });
  if (user.bonusBalance < params.amount) {
    throw new Error("INSUFFICIENT_BONUS");
  }

  const [ledger, updated] = await prisma.$transaction([
    prisma.bonusLedger.create({
      data: {
        userId: params.userId,
        amount: -params.amount,
        reason: "order_spend",
        meta: params.meta,
      },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: { bonusBalance: { decrement: params.amount } },
    }),
  ]);

  return { ledger, user: updated };
}

export const KIDS_SHAPE_TO_SLUG = {
  bunny: "bunny-croissant",
  bear: "bear-croissant",
  volcano: "volcano-cruffin",
} as const;
