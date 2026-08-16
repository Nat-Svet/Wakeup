import type { Delivery, DeliveryItem, Dish, Payment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { spendBonus } from "@/lib/bonuses";

type DeliveryWithItems = Delivery & {
  items: (DeliveryItem & { dish: Dish })[];
};

export function calcItemsTotal(delivery: DeliveryWithItems) {
  return delivery.items.reduce((sum, item) => {
    if (item.quantity <= 0) return sum;
    return sum + item.dish.price * item.quantity;
  }, 0);
}

export function hasPendingKidsQty(delivery: DeliveryWithItems) {
  return delivery.items.some(
    (item) => item.shape && item.glaze && item.filling && item.quantity === 0
  );
}

export async function createCheckout(params: {
  userId: string;
  deliveryId: string;
  bonusToSpend: number;
  idempotencyKey: string;
}) {
  const existing = await prisma.payment.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    if (existing.userId !== params.userId) {
      throw new Error("IDEMPOTENCY_CONFLICT");
    }
    return { payment: existing, reused: true as const };
  }

  const alreadyPaid = await prisma.payment.findFirst({
    where: {
      deliveryId: params.deliveryId,
      userId: params.userId,
      status: "paid",
    },
  });
  if (alreadyPaid) {
    throw new Error("ALREADY_PAID");
  }

  const delivery = await prisma.delivery.findFirst({
    where: { id: params.deliveryId, userId: params.userId },
    include: { items: { include: { dish: true } } },
  });
  if (!delivery) throw new Error("DELIVERY_NOT_FOUND");
  if (hasPendingKidsQty(delivery)) throw new Error("PENDING_KIDS_QTY");

  const itemsTotal = calcItemsTotal(delivery);
  if (itemsTotal <= 0) throw new Error("EMPTY_ORDER");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
  });

  const bonusToSpend = Math.max(
    0,
    Math.min(params.bonusToSpend, user.bonusBalance, itemsTotal)
  );
  const amountDue = itemsTotal - bonusToSpend;

  const payment = await prisma.payment.create({
    data: {
      userId: params.userId,
      deliveryId: params.deliveryId,
      status: "pending",
      itemsTotal,
      bonusSpent: bonusToSpend,
      amountDue,
      amountPaid: 0,
      idempotencyKey: params.idempotencyKey,
      provider: "mock",
      meta: {
        date: delivery.date.toISOString().slice(0, 10),
        timeSlot: delivery.timeSlot,
      },
    },
  });

  return { payment, reused: false as const };
}

export async function confirmMockPayment(params: {
  userId: string;
  paymentId: string;
}) {
  const payment = await prisma.payment.findFirst({
    where: { id: params.paymentId, userId: params.userId },
  });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status === "paid") return { payment, alreadyPaid: true as const };
  if (payment.status !== "pending") throw new Error("INVALID_STATUS");

  // Mock provider: always succeeds
  if (payment.bonusSpent > 0) {
    try {
      await spendBonus({
        userId: params.userId,
        amount: payment.bonusSpent,
        meta: { paymentId: payment.id, deliveryId: payment.deliveryId },
      });
    } catch {
      throw new Error("INSUFFICIENT_BONUS");
    }
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "paid",
      amountPaid: payment.amountDue,
      providerPaymentId: `mock_${payment.id.slice(-8)}`,
      receiptCode: `PV-${Date.now().toString(36).toUpperCase()}`,
      paidAt: new Date(),
    },
  });

  return { payment: updated, alreadyPaid: false as const };
}

export function serializePayment(payment: Payment) {
  return {
    id: payment.id,
    userId: payment.userId,
    deliveryId: payment.deliveryId,
    status: payment.status,
    currency: payment.currency,
    itemsTotal: payment.itemsTotal,
    bonusSpent: payment.bonusSpent,
    amountDue: payment.amountDue,
    amountPaid: payment.amountPaid,
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    receiptCode: payment.receiptCode,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}
