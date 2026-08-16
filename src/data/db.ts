import type {
  BunShape,
  Delivery,
  Dish,
  Subscription,
  User,
} from "@/types";
import { buildInitialDeliveries } from "@/lib/week-dates";

export { buildInitialDeliveries as getInitialDeliveries } from "@/lib/week-dates";

/** Prefer getInitialDeliveries() at runtime so the week tracks «сегодня». */
export const INITIAL_DELIVERIES = buildInitialDeliveries();

export const CURRENT_USER: User = {
  id: "u1",
  name: "Анна",
  city: "Москва",
  street: "ул. Солнечная",
  building: "5",
  apartment: "42",
  bonusBalance: 350,
  avatarInitials: "А",
};

export const SUBSCRIPTION: Subscription = {
  id: "s1",
  userId: "u1",
  active: true,
  paused: false,
  price: 2490,
};

/** Local catalog id → API dish slug (seed). */
export const DISH_SLUG_BY_LOCAL_ID: Record<string, string> = {
  d1: "almond-croissant",
  d2: "salmon-croissant",
  d3: "healthy-muffin",
  d4: "brioche-cream",
  d5: "bunny-croissant",
  d6: "berry-cruffin",
  d7: "bear-croissant",
  d8: "volcano-cruffin",
};

export const LOCAL_DISH_ID_BY_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(DISH_SLUG_BY_LOCAL_ID).map(([id, slug]) => [slug, id])
);

export const DISHES: Dish[] = [
  {
    id: "d1",
    name: "Круассан с миндальным кремом",
    description: "Слоёный, тёплый, с лёгкой хрустящей корочкой",
    imageUrl: "/dishes/almond-croissant.jpg",
    price: 220,
    calories: 320,
    protein: 7,
    fat: 18,
    carbs: 32,
    isKids: false,
    isHealthy: false,
  },
  {
    id: "d2",
    name: "Круассан с лососем и сливочным сыром",
    description: "Сытный утренний вариант с нежным лососем",
    imageUrl: "/dishes/salmon-croissant.jpg",
    price: 320,
    calories: 380,
    protein: 16,
    fat: 22,
    carbs: 28,
    isKids: false,
    isHealthy: false,
  },
  {
    id: "d3",
    name: "ЗОЖ-маффин без сахара",
    description: "Овсяный маффин на эритрите с ягодами",
    imageUrl: "/dishes/healthy-muffin.jpg",
    price: 180,
    calories: 210,
    protein: 8,
    fat: 9,
    carbs: 24,
    isKids: false,
    isHealthy: true,
  },
  {
    id: "d4",
    name: "Бриошь с ванильным кремом",
    description: "Воздушная булочка с домашним кремом",
    imageUrl: "/dishes/brioche-cream.jpg",
    price: 210,
    calories: 290,
    protein: 6,
    fat: 14,
    carbs: 36,
    isKids: false,
    isHealthy: false,
  },
  {
    id: "d5",
    name: "Круассан-Зайчик",
    description: "Игривая форма для утреннего настроения",
    imageUrl: "/dishes/bunny-croissant.jpg",
    price: 190,
    calories: 260,
    protein: 5,
    fat: 12,
    carbs: 34,
    isKids: true,
    isHealthy: false,
  },
  {
    id: "d7",
    name: "Круассан-Мишка",
    description: "Мягкий и уютный круассан в форме мишки",
    imageUrl: "/dishes/bear-croissant.jpg",
    price: 190,
    calories: 265,
    protein: 5,
    fat: 12,
    carbs: 35,
    isKids: true,
    isHealthy: false,
  },
  {
    id: "d8",
    name: "Краффин-Вулкан",
    description: "Хрустящий краффин с ягодной «лавой»",
    imageUrl: "/dishes/volcano-cruffin.jpg",
    price: 230,
    calories: 290,
    protein: 5,
    fat: 13,
    carbs: 38,
    isKids: true,
    isHealthy: false,
  },
  {
    id: "d6",
    name: "Ягодный краффин",
    description: "Хруст снаружи, нежность внутри",
    imageUrl: "/dishes/berry-cruffin.jpg",
    price: 240,
    calories: 340,
    protein: 6,
    fat: 16,
    carbs: 42,
    isKids: false,
    isHealthy: false,
  },
];

export const TIME_SLOTS = [
  "07:30 - 07:45",
  "07:45 - 08:00",
  "08:00 - 08:15",
  "08:15 - 08:30",
  "08:30 - 08:45",
  "08:45 - 09:00",
  "09:00 - 09:15",
];

export const MAX_ITEM_QUANTITY = 10;

export const KIDS_SHAPE_TO_DISH: Record<BunShape, string> = {
  bunny: "d5",
  bear: "d7",
  volcano: "d8",
};

export const GLAZE_LABELS: Record<string, string> = {
  raspberry: "глазурь малина",
  mango: "глазурь манго",
  spinach: "глазурь шпинат",
};

export const FILLING_LABELS: Record<string, string> = {
  caramel: "карамель",
  banana: "банановое пюре",
};

export function createItemId() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDishById(id: string): Dish {
  const dish = DISHES.find((item) => item.id === id);
  if (dish) return dish;
  return {
    id,
    name: "Позиция заказа",
    description: "",
    imageUrl: "/dishes/almond-croissant.jpg",
    price: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    isKids: false,
    isHealthy: false,
  };
}

export function formatRub(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}

export function getDeliveryTotalPieces(items: Delivery["items"]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Сумма заказа: цена × количество (позиции с qty 0 не входят). */
export function getDeliveryTotalPrice(items: Delivery["items"]) {
  return items.reduce((sum, item) => {
    if (item.quantity <= 0) return sum;
    return sum + getDishById(item.dishId).price * item.quantity;
  }, 0);
}

/** Детские позиции, где родитель ещё не поставил количество. */
export function getPendingKidsItems(items: Delivery["items"]) {
  return items.filter((item) => Boolean(item.kidsCustom) && item.quantity === 0);
}

export function hasPendingKidsQuantity(items: Delivery["items"]) {
  return getPendingKidsItems(items).length > 0;
}

/** Adult catalog lines only (no kids constructions). */
export function upsertAdultDeliveryItem(
  items: Delivery["items"],
  dishId: string,
  quantity: number
): Delivery["items"] {
  const kidsItems = items.filter((item) => item.kidsCustom);
  const adultItems = items.filter((item) => !item.kidsCustom);
  const existing = adultItems.find((item) => item.dishId === dishId);
  const rest = adultItems.filter((item) => item.dishId !== dishId);
  if (quantity <= 0) return [...rest, ...kidsItems];
  return [
    ...rest,
    {
      id: existing?.id ?? createItemId(),
      dishId,
      quantity,
    },
    ...kidsItems,
  ];
}

export function sameKidsCustom(
  a: Delivery["items"][number]["kidsCustom"],
  b: Delivery["items"][number]["kidsCustom"]
) {
  if (!a || !b) return false;
  return (
    a.shape === b.shape && a.glaze === b.glaze && a.filling === b.filling
  );
}
