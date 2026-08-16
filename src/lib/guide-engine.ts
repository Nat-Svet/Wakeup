import { DISHES, formatRub } from "@/data/db";
import type { Delivery } from "@/types";
import { lookupKnowledge } from "@/lib/app-knowledge";
import { buildUnknownReply, resetUnknownStreak } from "@/lib/guide-moderation";

export type GuideCartAction = {
  type: "add_to_cart";
  dishId: string;
  deliveryId: string;
  dayLabel: string;
  dishName: string;
  label: string;
};

export type GuideHumanAction = {
  type: "call_human";
  label: string;
};

export type GuideAction = GuideCartAction | GuideHumanAction;

export type GuideReply = {
  text: string;
  action?: GuideAction;
  suggestions?: string[];
  /** Message matched nothing in knowledge / engine */
  unknown?: boolean;
};

const DAY_ALIASES: { keys: string[]; label: string }[] = [
  { keys: ["суббот", "сб"], label: "Суббота" },
  { keys: ["воскресень", "вс"], label: "Воскресенье" },
  { keys: ["понедельник", "пн"], label: "Понедельник" },
  { keys: ["вторник", "вт"], label: "Вторник" },
  { keys: ["сред", "ср"], label: "Среда" },
  { keys: ["четверг", "чт"], label: "Четверг" },
  { keys: ["пятниц", "пт"], label: "Пятница" },
];

const DISH_ALIASES: { keys: string[]; dishId: string }[] = [
  { keys: ["лосос", "семг", "рыб", "сливочн"], dishId: "d2" },
  { keys: ["миндал"], dishId: "d1" },
  { keys: ["маффин", "зож", "пп", "без сахар", "овсян"], dishId: "d3" },
  { keys: ["бриош", "ванильн"], dishId: "d4" },
  { keys: ["ягодн", "берри"], dishId: "d6" },
  { keys: ["вулкан"], dishId: "d8" },
  { keys: ["зайчик", "зайц", "кролик"], dishId: "d5" },
  { keys: ["мишк", "медвед"], dishId: "d7" },
  { keys: ["краффин"], dishId: "d6" },
  { keys: ["круассан"], dishId: "d1" },
];

function normalize(text: string) {
  return text.toLowerCase().replaceAll("ё", "е").trim();
}

function hasAny(n: string, keys: string[]) {
  return keys.some((k) => n.includes(k));
}

function findDayLabel(text: string, deliveries: Delivery[]): string | null {
  const n = normalize(text);
  if (n.includes("сегодня") || n.includes("сегодн")) {
    // Сегодня для заказа недоступен — подскажем ближайший
    return (
      deliveries.find((d) => d.isNearestBreakfast)?.dayLabel ??
      deliveries.find((d) => !d.orderDisabled)?.dayLabel ??
      null
    );
  }
  if (n.includes("завтра")) {
    const tomorrow = deliveries.find((d) => d.isTomorrow);
    if (tomorrow && !tomorrow.orderDisabled) return tomorrow.dayLabel;
    return (
      deliveries.find((d) => d.isNearestBreakfast)?.dayLabel ??
      deliveries.find((d) => !d.orderDisabled)?.dayLabel ??
      null
    );
  }
  for (const day of DAY_ALIASES) {
    if (day.keys.some((k) => n.includes(k))) return day.label;
  }
  return null;
}

function findDeliveryByDayLabel(
  deliveries: Delivery[],
  dayLabel: string
): Delivery | undefined {
  return deliveries.find(
    (d) => d.dayLabel.toLowerCase() === dayLabel.toLowerCase()
  );
}

function findDishId(text: string): string | null {
  const n = normalize(text);
  for (const entry of DISH_ALIASES) {
    if (entry.dishId === "d1" && entry.keys.includes("круассан")) continue;
    if (entry.keys.some((k) => n.includes(k))) return entry.dishId;
  }
  if (n.includes("круассан")) return "d1";
  return null;
}

function wantsOrder(text: string) {
  const n = normalize(text);
  return hasAny(n, [
    "хочу",
    "заказ",
    "добав",
    "полож",
    "возьм",
    "принеси",
    "давай",
    "набери",
    "оформи",
  ]);
}

function adultMenuLines() {
  return DISHES.filter((d) => !d.isKids)
    .map((d) => `• ${d.name} — ${formatRub(d.price)}`)
    .join("\n");
}

function formatKbju(dish: (typeof DISHES)[number]) {
  return `${dish.calories} ккал · Б ${dish.protein} г · Ж ${dish.fat} г · У ${dish.carbs} г`;
}

function kbjuBlock(dish: (typeof DISHES)[number]) {
  return `«${dish.name}»\n${formatKbju(dish)}\nЦена: ${formatRub(dish.price)}`;
}

function allKbjuLines(includeKids = false) {
  return DISHES.filter((d) => includeKids || !d.isKids)
    .map((d) => `• ${d.name}: ${formatKbju(d)}`)
    .join("\n");
}

function buildOrderReply(
  userText: string,
  deliveries: Delivery[]
): GuideReply | null {
  const n = normalize(userText);
  if (!(wantsOrder(userText) || findDishId(n) || findDayLabel(n, deliveries))) {
    return null;
  }

  const dishId = findDishId(n) ?? "d1";
  const dish = DISHES.find((d) => d.id === dishId) ?? DISHES[0];
  const dayLabel = findDayLabel(n, deliveries);
  const availableDays = deliveries.map((d) => d.dayLabel).join(", ");
  const delivery = dayLabel
    ? findDeliveryByDayLabel(deliveries, dayLabel)
    : undefined;

  if (!delivery) {
    return {
      text: dayLabel
        ? `День «${dayLabel}» сейчас не в сетке. Доступно: ${availableDays}. Уточни день — и добавим 🥐`
        : `Отличный вкус! Уточни день (${availableDays}) — и я дам кнопку «Добавить в заказ».`,
      suggestions: [
        `Хочу ${dish.name.toLowerCase()} на субботу`,
        "Что в меню?",
      ],
    };
  }

  const shortDay = delivery.dayLabel;
  return {
    text: `Лови план: «${dish.name}» на ${shortDay.toLowerCase()}. Жми кнопку — положу в заказ. Потом оплати до 21:00 накануне 🙌`,
    action: {
      type: "add_to_cart",
      dishId: dish.id,
      deliveryId: delivery.id,
      dayLabel: shortDay,
      dishName: dish.name,
      label: `🛒 Добавить в заказ на ${shortDay}`,
    },
    suggestions: ["Что в меню?", "Как оплатить?", "Какие бонусы?"],
  };
}

/** Simulated «Твой гид» — rule-based replies for diploma demo (no external AI). */
export function replyAsGuide(
  userText: string,
  deliveries: Delivery[]
): GuideReply {
  const reply = resolveGuideReply(userText, deliveries);
  if (!reply.unknown) resetUnknownStreak();
  return reply;
}

function resolveGuideReply(
  userText: string,
  deliveries: Delivery[]
): GuideReply {
  const n = normalize(userText);
  const availableDays = deliveries.map((d) => d.dayLabel).join(", ");

  const fromKnowledge = lookupKnowledge(userText);
  if (fromKnowledge) {
    return {
      text: fromKnowledge,
      suggestions: [
        "Как это работает?",
        "Где КБЖУ?",
        "Хочу круассан с лососем на субботу",
      ],
    };
  }

  // Greetings
  if (
    hasAny(n, ["привет", "здравств", "доброе утро", "добрый день", "hey", "hello"]) &&
    n.length < 40
  ) {
    return {
      text: "Привет! Я «Твой гид» ✨ Могу объяснить, как заказать завтрак, подсказать меню, слоты, бонусы — или сразу добавить выпечку на день.",
      suggestions: [
        "Как это работает?",
        "Что в меню?",
        "Хочу круассан с лососем на субботу",
      ],
    };
  }

  // Thanks / bye
  if (hasAny(n, ["спасиб", "благодар", "супер", "класс", "отлично"])) {
    return {
      text: "Всегда пожалуйста! Если что — я тут, справа внизу на «Неделе». Приятного завтрака 🥐",
      suggestions: ["Что в меню?", "Какие бонусы?"],
    };
  }
  if (hasAny(n, ["пока", "до свидан", "увидим"])) {
    return {
      text: "До завтрака! Не забудь оформить заказ до 21:00 накануне 🌙",
      suggestions: ["До скольки заказ?", "Как это работает?"],
    };
  }

  // How it works
  if (
    hasAny(n, [
      "как это работает",
      "как работает",
      "что это за",
      "расскажи о",
      "в чем смысл",
      "для чего",
      "онбординг",
      "инструкц",
      "как пользовать",
      "с чего начать",
      "новичок",
    ]) ||
    n === "помощь" ||
    n === "help" ||
    n === "?"
  ) {
    return {
      text: "Как всё устроено:\n\n1. Полистай приложение гостем; когда готов — войди или зарегистрируйся.\n2. На «Неделе» выбери день. Сегодня заказать нельзя — кухня печёт ночью под заказы накануне. **Мы не греем вчерашнее.**\n3. До 21:00 можно заказать на завтрашнее утро. После 21:00 завтра закрывается, ближайший день — послезавтра. Вперёд — окно примерно на 6 дней.\n4. Открой «Меню», собери состав. Детское — во вкладке «Детская», количество ставит взрослый.\n5. Нажми «Оплатить заказ» (можно списать бонусы). После оплаты день уходит в «Трекер».\n6. Слот будильника выбираешь только после оплаты — привезём ещё тёплым к подъёму. Можно «у двери» и тихий пуш.\n7. Утром смотри статус в «Трекере». Чеки — в «Профиле» → «История заказов».\n\nКоротко: вечерний заказ → ночная выпечка → утро у двери. Дедлайн 21:00 — чтобы успеть испечь именно твой объём.",
      suggestions: [
        "Что в меню?",
        "До скольки заказ?",
        "Слоты доставки",
      ],
    };
  }

  // Deadline 21:00
  if (
    hasAny(n, [
      "21:00",
      "21.00",
      "до 21",
      "дедлайн",
      "до скольк",
      "до которого час",
      "когда нужно заказ",
      "успею ли",
      "поздно заказ",
      "после девят",
      "накануне",
    ])
  ) {
    return {
      text: "Заказ на утро оформляй до 21:00 накануне — кухня успевает посчитать объёмы выпекания. После 21:00 на завтра уже «спать» 😴 Можно собрать несколько дней заранее.",
      suggestions: ["Как это работает?", "Слоты доставки", "Что в меню?"],
    };
  }

  // Delivery / slots / alarm
  if (
    hasAny(n, [
      "слот",
      "интервал",
      "15 минут",
      "пятнадцати",
      "во сколько привез",
      "время достав",
      "когда привезут",
      "к которому часу",
    ])
  ) {
    return {
      text: "Доставка — в 15-минутных утренних слотах (например 07:45–08:00). Слот выбираешь после оплаты в блоке «Умный будильник».",
      suggestions: ["Как оплатить?", "Оставить у двери", "Тихий режим"],
    };
  }

  if (hasAny(n, ["будильник", "разбуд", "к пробужден"])) {
    return {
      text: "«Умный будильник» — это выбор слота после оплаты: привезём ещё тёплым к твоему подъёму. Сначала оплати заказ, потом выбери слот.",
      suggestions: ["Как оплатить?", "Слоты доставки"],
    };
  }

  if (hasAny(n, ["ручк", "у двери", "без звонк", "не звон", "консьерж"])) {
    return {
      text: "Можно отметить «Оставить на ручке двери» — курьер аккуратно повесит завтрак и не потревожит. Удобно, если ещё спишь 🚪",
      suggestions: ["Тихий режим", "Слоты доставки"],
    };
  }

  if (hasAny(n, ["тих", "без звук", "пуш", "уведомлен"])) {
    return {
      text: "«Тихое пуш-уведомление» — без звонка в дверь: только мягкий пуш, что завтрак уже у тебя. Включается в настройках консьержа на «Неделе».",
      suggestions: ["Оставить у двери", "Как это работает?"],
    };
  }

  if (hasAny(n, ["доставк", "курьер", "логистик", "микрорайон", "район"])) {
    return {
      text: "Возим по микрорайону короткими утренними рейсами. Статус смотри во вкладке «Трекер» после оплаты: замешиваем → выпекаем → в пути → у двери.",
      suggestions: ["Где трекер?", "Соседский шеринг", "Слоты доставки"],
    };
  }

  // Bonuses
  if (hasAny(n, ["бонус", "шеринг", "сосед", "+50", "баллы", "кэшбек", "cashback"])) {
    return {
      text: "Соседский шеринг: если доставка в один подъезд/дом идёт вместе с соседями — +50 бонусов. Бонусы можно списать при оплате заказа (в модалке оплаты).",
      suggestions: ["Как оплатить?", "Как это работает?"],
    };
  }

  // One-time only (if asked about subscription words)
  if (hasAny(n, ["подписк", "абонемент", "тариф", "пакет дней", "ежемесяч"])) {
    return {
      text: "У нас только разовые заказы: выбираешь дни, оплачиваешь только их. Не нужно на завтра — просто не оформляешь заказ.",
      suggestions: ["Как это работает?", "Что в меню?"],
    };
  }

  // Menu / prices / calories
  if (
    hasAny(n, [
      "меню",
      "ассортимент",
      "что есть",
      "какие круасс",
      "что посовету",
      "выпечк",
      "каталог",
      "позиции",
      "что можно заказ",
    ])
  ) {
    return {
      text: `Взрослое меню сейчас такое:\n${adultMenuLines()}\n\nДетские формы — во вкладке «Детская». Напиши, что взять и на какой день — дам кнопку добавления.`,
      suggestions: [
        "Хочу круассан с лососем на субботу",
        "Есть ЗОЖ?",
        "Что для детей?",
      ],
    };
  }

  if (hasAny(n, ["цен", "сколько стоит", "прайс", "дорого", "дешев"])) {
    return {
      text: `Цены от ${formatRub(180)} (ЗОЖ-маффин) до ${formatRub(320)} (круассан с лососем). Полный список — спроси «Что в меню?» или открой кнопку «Меню» на карточке заказа.`,
      suggestions: ["Что в меню?", "КБЖУ лосося", "Хочу зож-маффин на воскресенье"],
    };
  }

  // КБЖУ — nutrition breakdown
  if (
    hasAny(n, [
      "кбжу",
      "бжу",
      "пищев",
      "нутриен",
      "белк",
      "жир",
      "углевод",
      "калор",
      "ккал",
      "энергет",
    ])
  ) {
    const dishId = findDishId(n);
    if (dishId) {
      const dish = DISHES.find((d) => d.id === dishId)!;
      return {
        text: `Раскладка по КБЖУ:\n${kbjuBlock(dish)}\n\nЭто на 1 шт. Нужно в заказ — напиши день недели.`,
        suggestions: [
          `Хочу ${dish.name.toLowerCase()} на субботу`,
          "КБЖУ всего меню",
          "Есть ЗОЖ?",
        ],
      };
    }

    if (
      hasAny(n, ["все", "всего меню", "все позиции", "полная", "список", "таблица"]) ||
      n.includes("кбжу") ||
      n.includes("бжу")
    ) {
      return {
        text: `КБЖУ взрослого меню (на 1 шт):\n${allKbjuLines(false)}\n\nСпроси по позиции, например: «КБЖУ круассана с лососем».`,
        suggestions: [
          "КБЖУ лосося",
          "КБЖУ миндального",
          "КБЖУ зож-маффина",
          "Что в меню?",
        ],
      };
    }

    return {
      text: `Могу дать КБЖУ по любой позиции. Например:\n${kbjuBlock(DISHES.find((d) => d.id === "d2")!)}\n\nИли скажи «КБЖУ всего меню» — пришлю список.`,
      suggestions: [
        "КБЖУ всего меню",
        "КБЖУ лосося",
        "КБЖУ зож-маффина",
        "Есть ЗОЖ?",
      ],
    };
  }

  if (hasAny(n, ["зож", "пп", "полезн", "без сахар", "лёгк", "легк", "диетич"])) {
    const muffin = DISHES.find((d) => d.id === "d3")!;
    return {
      text: `Самый лёгкий вариант — «${muffin.name}».\nКБЖУ: ${formatKbju(muffin)}\nЦена: ${formatRub(muffin.price)}. Могу добавить на день — напиши какой.`,
      suggestions: [
        "Хочу зож-маффин на субботу",
        "КБЖУ всего меню",
        "Что в меню?",
      ],
    };
  }

  // Kids
  if (hasAny(n, ["детск", "ребен", "ребён", "дочк", "сын", "зайчик", "мишк", "вулкан", "для детей", "малыш"])) {
    return {
      text: "Для детей — вкладка «Детская»: собираешь форму (зайчик, мишка, вулкан), глазурь и начинку, отправляешь родителю в заказ. Количество ставит взрослый на «Неделе» (с нуля — осознанно).",
      suggestions: ["Как это работает?", "Что в меню?"],
    };
  }

  // Tracker / navigation
  if (hasAny(n, ["трекер", "где заказ едет", "статус", "где курьер", "отслеж"])) {
    return {
      text: "Трекер — нижняя вкладка «Трекер». Там видны только оплаченные заказы и живой статус в день доставки. Пока день не оплачен — собирай его на «Неделе».",
      suggestions: ["Как оплатить?", "Как это работает?"],
    };
  }

  if (hasAny(n, ["навигац", "где найти", "куда нажат", "где кнопка", "как открыть", "где меню", "вкладк"])) {
    return {
      text: "На «Неделе»: сверху дни, ниже карточка заказа и «Меню», ещё ниже — будильник и консьерж. «Детская» — конструктор для детей. «Трекер» — оплаченные доставки. «Аккаунт» — профиль. Я — кнопка «Твой гид» справа внизу.",
      suggestions: ["Что в меню?", "Как оплатить?"],
    };
  }

  // Payment
  if (
    hasAny(n, [
      "оплат",
      "заплат",
      "чек",
      "карт",
      "как купить",
      "как оформить оплат",
      "checkout",
    ])
  ) {
    return {
      text: "Собери заказ на день → «Оплатить заказ». Можно списать бонусы. Это демо-оплата без реальной карты. После оплаты день уходит в трекер, а слот будильника открывается на «Неделе».",
      suggestions: ["Какие бонусы?", "Слоты доставки", "До скольки заказ?"],
    };
  }

  // Change / cancel
  if (hasAny(n, ["отмен", "удал заказ", "убрать", "изменить заказ", "поменять состав", "замен"])) {
    return {
      text: "До оплаты всё гибко: открой день, «Меню» — меняй состав, минусом убери позиции. После оплаты состав дня уже в трекере; новый заказ — на другой день сетки.",
      suggestions: ["Что в меню?", "Как оплатить?"],
    };
  }

  // Address / account
  if (hasAny(n, ["адрес", "квартир", "улиц", "дом", "куда вез", "профил", "аккаунт"])) {
    return {
      text: "Адрес доставки — в «Аккаунте» (город, улица, дом, квартира). Курьер ориентируется на него. Бонусы тоже видно в шапке «Недели» и в профиле.",
      suggestions: ["Как это работает?", "Какие бонусы?"],
    };
  }

  // Warm / quality / freshness
  if (hasAny(n, ["горяч", "тёпл", "тепл", "свеж", "остын", "качество", "вкусн"])) {
    return {
      text: "Фишка как раз в этом: вечерний предзаказ → утром печём под твой слот → привозим ещё тёплым. Поэтому и дедлайн до 21:00 — чтобы всё успеть 🔥",
      suggestions: ["До скольки заказ?", "Слоты доставки"],
    };
  }

  // Allergy (general)
  if (hasAny(n, ["аллерг", "глютен", "орех", "лактоз", "молочн"])) {
    return {
      text: "В выпечке могут быть глютен, молочные продукты и орехи (миндаль). Если есть строгая аллергия — лучше выбрать позицию внимательно в «Меню» или спросить на защите у «повара» 😊 В демо полный состав упрощён.",
      suggestions: ["Что в меню?", "Есть ЗОЖ?"],
    };
  }

  // Weather / late joke
  if (hasAny(n, ["опозда", "задерж", "дождь", "снег", "пробк"])) {
    return {
      text: "Мы закладываем короткие слоты по микрорайону. Если вдруг задержка — статус будет в «Трекере». А пока идеальный план: заказ до 21:00 и слот к твоему подъёму 🚕",
      suggestions: ["Где трекер?", "До скольки заказ?"],
    };
  }

  // Who are you
  if (hasAny(n, ["кто ты", "ты бот", "ты ии", "ты искус", "гид"])) {
    return {
      text: "Я «Твой гид» — демо-помощник в приложении: отвечаю на частые вопросы и могу добавить выпечку в заказ на день. Для защиты диплома работаю без внешнего ИИ, но по делу 😉",
      suggestions: ["Как это работает?", "Что в меню?"],
    };
  }

  // Days in week
  if (hasAny(n, ["какие дни", "на какие дни", "сетка", "календар", "неделя"])) {
    return {
      text: `Сейчас в сетке: ${availableDays}. Неделя начинается с сегодня — вчерашние дни не показываем. Заказ только на доступные дни.`,
      suggestions: [
        "Хочу круассан с лососем на субботу",
        "Как это работает?",
      ],
    };
  }

  // Order intent (after FAQ, so specific questions win)
  const orderReply = buildOrderReply(userText, deliveries);
  if (orderReply) return orderReply;

  return buildUnknownReply();
}

export const GUIDE_ONBOARDING_STEPS = [
  {
    targetId: "guide-week-calendar",
    title: "Дни недели",
    body: "Разовые заказы на нужные дни. Начни с сегодня.",
  },
  {
    targetId: "alarm-slots",
    title: "Утренний слот",
    body: "После оплаты выберешь 15-минутный слот к пробуждению.",
  },
  {
    targetId: "guide-order-card",
    title: "Заказ",
    body: "Собери выпечку здесь и оплати до 21:00 накануне.",
  },
] as const;

export const GUIDE_STORAGE_KEY = "prosyvaisya-guide-onboarding-v1";
