import {
  LOCAL_DISH_ID_BY_SLUG,
  DISH_SLUG_BY_LOCAL_ID,
} from "@/data/db";
import type { Delivery, DeliveryItem, DeliveryStatus } from "@/types";
import {
  dateFromLocalDeliveryId,
  getDayOrderMeta,
  monthGenitiveFromYmd,
  weekdayMetaFromYmd,
} from "@/lib/week-dates";

export type ApiDish = {
  id: string;
  slug: string;
  name: string;
};

export type ApiDeliveryItem = {
  id: string;
  dishId: string;
  dishSlug?: string | null;
  dishName?: string | null;
  quantity: number;
  kidsCustom?: DeliveryItem["kidsCustom"];
};

export type ApiDelivery = {
  id: string;
  date: string;
  timeSlot: string;
  status: DeliveryStatus;
  leaveAtDoor: boolean;
  silentPush: boolean;
  items: ApiDeliveryItem[];
};

/** Resolve calendar date for a local delivery id (`del-YYYY-MM-DD`). */
export function localDeliveryDateById(id: string): string | null {
  return dateFromLocalDeliveryId(id);
}

/** @deprecated use localDeliveryDateById */
export const LOCAL_DELIVERY_DATE_BY_ID: Record<string, string> = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== "string") return undefined;
      return localDeliveryDateById(prop) ?? undefined;
    },
  }
);

export type DishIdMaps = {
  /** local d1 → API cuid */
  localToApi: Record<string, string>;
  /** API cuid → local d1 */
  apiToLocal: Record<string, string>;
};

export function buildDishIdMaps(dishes: ApiDish[]): DishIdMaps {
  const localToApi: Record<string, string> = {};
  const apiToLocal: Record<string, string> = {};

  for (const dish of dishes) {
    const localId = LOCAL_DISH_ID_BY_SLUG[dish.slug];
    if (!localId) continue;
    localToApi[localId] = dish.id;
    apiToLocal[dish.id] = localId;
  }

  return { localToApi, apiToLocal };
}

function resolveLocalDishId(
  item: ApiDeliveryItem,
  maps: DishIdMaps
): string {
  if (maps.apiToLocal[item.dishId]) return maps.apiToLocal[item.dishId];
  if (item.dishSlug && LOCAL_DISH_ID_BY_SLUG[item.dishSlug]) {
    return LOCAL_DISH_ID_BY_SLUG[item.dishSlug];
  }
  return item.dishId;
}

export function mapApiDeliveryToUi(
  api: ApiDelivery,
  maps: DishIdMaps
): Delivery {
  const meta = weekdayMetaFromYmd(api.date);
  const order = getDayOrderMeta(api.date);

  return {
    id: api.id,
    date: api.date,
    dayLabel: meta.dayLabel,
    dayShort: meta.dayShort,
    dayNumber: Number(api.date.slice(8, 10)) || 1,
    timeSlot: api.timeSlot,
    status: api.status,
    leaveAtDoor: api.leaveAtDoor,
    silentPush: api.silentPush,
    isToday: order.isToday,
    isTomorrow: order.isTomorrow,
    orderDisabled: order.orderDisabled,
    isNearestBreakfast: order.isNearestBreakfast,
    calendarBadge: order.calendarBadge,
    items: api.items.map((item) => ({
      id: item.id,
      dishId: resolveLocalDishId(item, maps),
      quantity: item.quantity,
      kidsCustom: item.kidsCustom,
    })),
  };
}

export function mapUiItemsToApiPayload(
  items: DeliveryItem[],
  maps: DishIdMaps
) {
  return items
    .filter((item) => item.kidsCustom || item.quantity > 0)
    .map((item) => {
      const slug = DISH_SLUG_BY_LOCAL_ID[item.dishId];
      const apiDishId = maps.localToApi[item.dishId];
      if (!apiDishId) {
        throw new Error(
          `No API dish mapping for local ${item.dishId} (${slug ?? "?"})`
        );
      }
      return {
        dishId: apiDishId,
        quantity: item.quantity,
        kidsCustom: item.kidsCustom,
      };
    });
}

export function formatDeliveryDayLine(delivery: {
  isToday?: boolean;
  isTomorrow?: boolean;
  dayLabel: string;
  dayNumber: number;
  timeSlot: string;
  date?: string;
}) {
  const day =
    delivery.isToday
      ? "Сегодня"
      : delivery.isTomorrow
        ? "Завтра"
        : delivery.dayLabel;
  const month = delivery.date
    ? monthGenitiveFromYmd(delivery.date)
    : "августа";
  const base = `${day}, ${delivery.dayNumber} ${month}`;
  const slot = delivery.timeSlot?.trim();
  return slot ? `${base} · слот ${slot}` : base;
}
