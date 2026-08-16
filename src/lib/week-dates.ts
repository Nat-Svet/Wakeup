import type { Delivery } from "@/types";

/** App calendar timezone for diploma / RU users. */
export const APP_TIME_ZONE = "Europe/Moscow";

/** Заказы на завтрашнее утро принимаем строго до этого часа (локальные часы `new Date()` в TZ приложения). */
export const ORDER_DEADLINE_HOUR = 21;

/** Сколько дней вперёд можно заказать, начиная с ближайшего доступного. */
export const ORDER_HORIZON_DAYS = 6;

const WEEKDAY_RU = [
  { dayLabel: "Воскресенье", dayShort: "Вс" },
  { dayLabel: "Понедельник", dayShort: "Пн" },
  { dayLabel: "Вторник", dayShort: "Вт" },
  { dayLabel: "Среда", dayShort: "Ср" },
  { dayLabel: "Четверг", dayShort: "Чт" },
  { dayLabel: "Пятница", dayShort: "Пт" },
  { dayLabel: "Суббота", dayShort: "Сб" },
] as const;

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
] as const;

/** Часы/дата «сейчас» через `new Date()` в часовом поясе приложения. */
export function getAppClock(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((p) => [p.type, p.value])
  );
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  const minute = Number(parts.minute);
  const ymd = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { ymd, year, month, day, hour, minute, now };
}

/** Today's date as YYYY-MM-DD in app timezone. */
export function todayYmd(now = new Date()): string {
  return getAppClock(now).ymd;
}

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

export function monthGenitiveFromYmd(ymd: string): string {
  const monthIndex = Number(ymd.slice(5, 7)) - 1;
  return MONTHS_GENITIVE[monthIndex] ?? "";
}

export function weekdayMetaFromYmd(ymd: string) {
  const day = parseYmd(ymd).getDay();
  return WEEKDAY_RU[day]!;
}

/** Дедлайн 21:00 уже прошёл — заказ на завтра закрыт. */
export function isPastOrderDeadline(now = new Date()): boolean {
  return getAppClock(now).hour >= ORDER_DEADLINE_HOUR;
}

/**
 * Ближайший день, на который ещё можно оформить утренний заказ.
 * До 21:00 — завтра; после 21:00 — послезавтра.
 */
export function getFirstOrderableYmd(now = new Date()): string {
  const { ymd } = getAppClock(now);
  return addDaysYmd(ymd, isPastOrderDeadline(now) ? 2 : 1);
}

/** Шесть дней горизонта планирования с ближайшего доступного. */
export function getOrderableYmds(now = new Date()): string[] {
  const first = getFirstOrderableYmd(now);
  const dates: string[] = [];
  for (let i = 0; i < ORDER_HORIZON_DAYS; i++) {
    dates.push(addDaysYmd(first, i));
  }
  return dates;
}

export function isDateOrderable(ymd: string, now = new Date()): boolean {
  return getOrderableYmds(now).includes(ymd);
}

/**
 * Даты ленты календаря: сегодня (всегда) + завтра (если после 21:00 — как заблокированный)
 * + 6 дней горизонта с ближайшего доступного.
 */
export function buildWeekDates(now = new Date()): string[] {
  const { ymd: today } = getAppClock(now);
  const tomorrow = addDaysYmd(today, 1);
  const orderable = getOrderableYmds(now);
  const set = new Set<string>([today, tomorrow, ...orderable]);
  return [...set].sort();
}

export function deliveryIdForDate(ymd: string): string {
  return `del-${ymd}`;
}

export function dateFromLocalDeliveryId(id: string): string | null {
  if (id.startsWith("del-") && /^\d{4}-\d{2}-\d{2}$/.test(id.slice(4))) {
    return id.slice(4);
  }
  return null;
}

export type DayOrderMeta = {
  isToday: boolean;
  isTomorrow: boolean;
  orderDisabled: boolean;
  isNearestBreakfast: boolean;
  /** Короткий бейдж в календаре */
  calendarBadge: string | null;
};

export function getDayOrderMeta(ymd: string, now = new Date()): DayOrderMeta {
  const { ymd: today } = getAppClock(now);
  const tomorrow = addDaysYmd(today, 1);
  const firstOrderable = getFirstOrderableYmd(now);
  const orderable = getOrderableYmds(now);
  const isToday = ymd === today;
  const isTomorrow = ymd === tomorrow;
  const isNearestBreakfast = ymd === firstOrderable;
  const orderDisabled = !orderable.includes(ymd);

  let calendarBadge: string | null = null;
  if (isToday) calendarBadge = "Сегодня";
  else if (isNearestBreakfast) calendarBadge = "Ближайший завтрак";
  else if (isTomorrow && orderDisabled) calendarBadge = "Завтра · закрыто";
  else if (isTomorrow) calendarBadge = "Завтра";

  return {
    isToday,
    isTomorrow,
    orderDisabled,
    isNearestBreakfast,
    calendarBadge,
  };
}

/** Empty week shells for guest / pre-hydrate UI. */
export function buildInitialDeliveries(now = new Date()): Delivery[] {
  const dates = buildWeekDates(now);

  return dates.map((date) => {
    const meta = weekdayMetaFromYmd(date);
    const order = getDayOrderMeta(date, now);
    const dayNumber = Number(date.slice(8, 10));
    return {
      id: deliveryIdForDate(date),
      date,
      dayLabel: meta.dayLabel,
      dayShort: meta.dayShort,
      dayNumber,
      timeSlot: "",
      status: "mixing" as const,
      items: [],
      leaveAtDoor: false,
      silentPush: false,
      isToday: order.isToday,
      isTomorrow: order.isTomorrow,
      orderDisabled: order.orderDisabled,
      isNearestBreakfast: order.isNearestBreakfast,
      calendarBadge: order.calendarBadge,
    };
  });
}

export function getDefaultSelectedDayId(deliveries: Delivery[]): string {
  const nearest =
    deliveries.find((d) => d.isNearestBreakfast && !d.orderDisabled) ??
    deliveries.find((d) => !d.orderDisabled);
  return nearest?.id ?? deliveries[0]?.id ?? "";
}

/** Подмешать актуальные флаги доступности; сохранить содержимое дней. */
export function mergeWeekDeliveries(
  existing: Delivery[],
  now = new Date()
): Delivery[] {
  const shells = buildInitialDeliveries(now);
  const byDate = new Map(existing.map((d) => [d.date, d]));
  return shells.map((shell) => {
    const prev = byDate.get(shell.date);
    if (!prev) return shell;
    return {
      ...prev,
      dayLabel: shell.dayLabel,
      dayShort: shell.dayShort,
      dayNumber: shell.dayNumber,
      isToday: shell.isToday,
      isTomorrow: shell.isTomorrow,
      orderDisabled: shell.orderDisabled,
      isNearestBreakfast: shell.isNearestBreakfast,
      calendarBadge: shell.calendarBadge,
    };
  });
}

export const DEADLINE_PASSED_BANNER =
  "⏳ Дедлайн 21:00 пройден. Принимаем заказы на утро послезавтра. Ночью мы выпекаем только то, что уже заказано!";
