import type { DeliveryStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { awardBonus } from "@/lib/bonuses";
import {
  COURIER,
  NEIGHBOR_SHARE_BONUS,
  getCourierQuote,
  nextTrackerStatus,
} from "@/data/tracker";

const ETA_BY_STATUS: Record<DeliveryStatus, number | null> = {
  mixing: 12,
  baking: 8,
  en_route: 5,
  at_door: 0,
};

export async function ensureTracking(deliveryId: string, status: DeliveryStatus) {
  return prisma.deliveryTracking.upsert({
    where: { deliveryId },
    update: {},
    create: {
      deliveryId,
      status,
      courierName: COURIER.name,
      courierPhone: COURIER.phone,
      courierNote: getCourierQuote(status, {
        leaveAtDoor: false,
        silentPush: false,
      }),
      etaMinutes: ETA_BY_STATUS[status],
    },
  });
}

export async function applyDeliveryStatus(params: {
  deliveryId: string;
  userId: string;
  status: DeliveryStatus;
  leaveAtDoor: boolean;
  silentPush: boolean;
  courierNote?: string | null;
}) {
  const note =
    params.courierNote ??
    getCourierQuote(params.status, {
      leaveAtDoor: params.leaveAtDoor,
      silentPush: params.silentPush,
    });

  const tracking = await prisma.deliveryTracking.upsert({
    where: { deliveryId: params.deliveryId },
    update: {
      status: params.status,
      etaMinutes: ETA_BY_STATUS[params.status],
      courierNote: note,
      courierName: COURIER.name,
      courierPhone: COURIER.phone,
    },
    create: {
      deliveryId: params.deliveryId,
      status: params.status,
      etaMinutes: ETA_BY_STATUS[params.status],
      courierNote: note,
      courierName: COURIER.name,
      courierPhone: COURIER.phone,
    },
  });

  await prisma.delivery.update({
    where: { id: params.deliveryId },
    data: { status: params.status },
  });

  let bonusAwarded = 0;
  let bonusBalance: number | null = null;

  if (params.status === "at_door" && !tracking.neighborBonusAwarded) {
    const updatedTracking = await prisma.deliveryTracking.update({
      where: { deliveryId: params.deliveryId },
      data: { neighborBonusAwarded: true },
    });

    const bonus = await awardBonus({
      userId: params.userId,
      amount: NEIGHBOR_SHARE_BONUS,
      reason: "neighbor_share",
      meta: { deliveryId: params.deliveryId } as Prisma.InputJsonValue,
    });

    bonusAwarded = NEIGHBOR_SHARE_BONUS;
    bonusBalance = bonus.user.bonusBalance;
    return { tracking: updatedTracking, bonusAwarded, bonusBalance };
  }

  return { tracking, bonusAwarded, bonusBalance };
}

export async function advanceDeliveryStatus(params: {
  deliveryId: string;
  userId: string;
  leaveAtDoor: boolean;
  silentPush: boolean;
  currentStatus: DeliveryStatus;
}) {
  const next = nextTrackerStatus(params.currentStatus);
  if (!next) {
    const tracking = await ensureTracking(
      params.deliveryId,
      params.currentStatus
    );
    return { tracking, advanced: false, bonusAwarded: 0, bonusBalance: null };
  }

  const result = await applyDeliveryStatus({
    deliveryId: params.deliveryId,
    userId: params.userId,
    status: next,
    leaveAtDoor: params.leaveAtDoor,
    silentPush: params.silentPush,
  });

  return { ...result, advanced: true };
}

export async function resetDeliveryTracking(params: {
  deliveryId: string;
  userId: string;
  leaveAtDoor: boolean;
  silentPush: boolean;
}) {
  // Reset neighbor flag so demo can re-award; do not claw back previous bonus
  await prisma.deliveryTracking.upsert({
    where: { deliveryId: params.deliveryId },
    update: { neighborBonusAwarded: false },
    create: {
      deliveryId: params.deliveryId,
      status: "mixing",
      neighborBonusAwarded: false,
      courierName: COURIER.name,
      courierPhone: COURIER.phone,
    },
  });

  return applyDeliveryStatus({
    deliveryId: params.deliveryId,
    userId: params.userId,
    status: "mixing",
    leaveAtDoor: params.leaveAtDoor,
    silentPush: params.silentPush,
  });
}
