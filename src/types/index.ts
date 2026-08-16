export type DeliveryStatus =
  | "mixing"
  | "baking"
  | "en_route"
  | "at_door";

export interface User {
  id: string;
  name: string;
  city: string;
  street: string;
  building: string;
  apartment: string;
  bonusBalance: number;
  avatarInitials: string;
}

export interface Subscription {
  id: string;
  userId: string;
  active: boolean;
  paused: boolean;
  price: number;
}

export interface Dish {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  /** Цена за штуку, ₽ */
  price: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  isKids: boolean;
  isHealthy: boolean;
}

export type BunShape = "bunny" | "bear" | "volcano";
export type GlazeColor = "raspberry" | "mango" | "spinach";
export type SecretFilling = "caramel" | "banana";

export interface KidsCustom {
  shape: BunShape;
  glaze: GlazeColor;
  filling: SecretFilling;
}

export interface DeliveryItem {
  id: string;
  dishId: string;
  quantity: number;
  kidsCustom?: KidsCustom;
}

export interface Delivery {
  id: string;
  date: string;
  dayLabel: string;
  dayShort: string;
  dayNumber: number;
  timeSlot: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  leaveAtDoor: boolean;
  silentPush: boolean;
  isTomorrow?: boolean;
  isToday?: boolean;
  /** Нельзя оформить заказ на этот день (сегодня / после 21:00 завтра / вне горизонта). */
  orderDisabled?: boolean;
  /** Ближайший доступный утренний завтрак. */
  isNearestBreakfast?: boolean;
  calendarBadge?: string | null;
}

export type TabId = "week" | "kids" | "tracker" | "account";
