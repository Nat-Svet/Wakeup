import { DeliveryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildWeekDates } from "@/lib/week-dates";

/** Rolling calendar dates for current order rules (today + horizon). */
export function getDemoWeekDates(now = new Date()): string[] {
  return buildWeekDates(now);
}

function utcFromYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

/** Ensure user has empty delivery shells for the current rolling week. */
export async function ensureDemoWeekDeliveries(userId: string) {
  for (const ymd of getDemoWeekDates()) {
    const date = utcFromYmd(ymd);
    const delivery = await prisma.delivery.upsert({
      where: {
        userId_date: { userId, date },
      },
      update: {},
      create: {
        userId,
        date,
        timeSlot: "",
        status: DeliveryStatus.mixing,
        leaveAtDoor: false,
        silentPush: false,
      },
    });

    await prisma.deliveryTracking.upsert({
      where: { deliveryId: delivery.id },
      update: {},
      create: {
        deliveryId: delivery.id,
        status: DeliveryStatus.mixing,
        courierName: "Алексей",
        courierPhone: "+79001234567",
        courierNote: "Готовлю маршрут по микрорайону",
        etaMinutes: 10,
      },
    });
  }
}
