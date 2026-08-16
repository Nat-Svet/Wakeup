import type {
  BonusLedger,
  Delivery,
  DeliveryItem,
  DeliveryTracking,
  Dish,
  Feedback,
  Subscription,
  User,
} from "@prisma/client";

type DeliveryWithItems = Delivery & {
  items: (DeliveryItem & { dish?: Dish })[];
  tracking?: DeliveryTracking | null;
};

function toDateString(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    city: user.city,
    street: user.street,
    building: user.building,
    apartment: user.apartment,
    avatarUrl: user.avatarUrl,
    avatarInitials: user.avatarInitials,
    bonusBalance: user.bonusBalance,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function formatUserAddress(user: {
  city?: string | null;
  street?: string | null;
  building: string;
  apartment: string;
}) {
  const parts = [
    user.city?.trim(),
    user.street?.trim(),
    user.building?.trim() ? `д. ${user.building.trim()}` : null,
    user.apartment?.trim() ? `кв. ${user.apartment.trim()}` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

export function serializeSubscription(sub: Subscription) {
  return {
    id: sub.id,
    userId: sub.userId,
    active: sub.active,
    paused: sub.paused,
    price: sub.price,
  };
}

export function serializeDish(dish: Dish) {
  return {
    id: dish.id,
    slug: dish.slug,
    name: dish.name,
    description: dish.description,
    imageUrl: dish.imageUrl,
    price: dish.price,
    calories: dish.calories,
    protein: dish.protein,
    fat: dish.fat,
    carbs: dish.carbs,
    isKids: dish.isKids,
    isHealthy: dish.isHealthy,
    isActive: dish.isActive,
  };
}

export function serializeDeliveryItem(
  item: DeliveryItem & { dish?: Dish | null }
) {
  const kidsCustom =
    item.shape && item.glaze && item.filling
      ? {
          shape: item.shape,
          glaze: item.glaze,
          filling: item.filling,
        }
      : undefined;

  return {
    id: item.id,
    dishId: item.dishId,
    dishSlug: item.dish?.slug ?? null,
    dishName: item.dish?.name ?? null,
    dishPrice: item.dish?.price ?? null,
    quantity: item.quantity,
    kidsCustom,
  };
}

export function serializeDelivery(delivery: DeliveryWithItems) {
  return {
    id: delivery.id,
    userId: delivery.userId,
    date: toDateString(delivery.date),
    timeSlot: delivery.timeSlot,
    status: delivery.status,
    leaveAtDoor: delivery.leaveAtDoor,
    silentPush: delivery.silentPush,
    items: delivery.items.map(serializeDeliveryItem),
  };
}

export function serializeTracking(tracking: DeliveryTracking) {
  return {
    deliveryId: tracking.deliveryId,
    status: tracking.status,
    etaMinutes: tracking.etaMinutes,
    courierName: tracking.courierName,
    courierPhone: tracking.courierPhone,
    courierNote: tracking.courierNote,
    neighborBonusAwarded: tracking.neighborBonusAwarded,
  };
}

export function serializeBonus(entry: BonusLedger) {
  return {
    id: entry.id,
    userId: entry.userId,
    amount: entry.amount,
    reason: entry.reason,
    meta: entry.meta,
    createdAt: entry.createdAt,
  };
}

export function serializeFeedback(feedback: Feedback) {
  return {
    id: feedback.id,
    userId: feedback.userId,
    deliveryId: feedback.deliveryId,
    rating: feedback.rating,
    kind: feedback.kind,
    tags: Array.isArray(feedback.tags) ? feedback.tags : [],
    comment: feedback.comment,
    bonusAwarded: feedback.bonusAwarded,
  };
}

export function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
