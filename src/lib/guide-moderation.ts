/**
 * Frontend moderation for «Твой гид» — demo logic for diploma defense.
 *
 * Три режима:
 * 1. unknown — нет в базе → разнообразные ответы + перевод к заказу;
 *    редко «цифровых сил» / ещё реже «Галя, у нас отмена!» + оператор
 * 2. playful — флирт/троллинг → мягкий юмор и возврат к завтраку
 * 3. aggression — мат/оскорбления → предупреждение; повтор → блок чата
 */

export type MessageTone = "ok" | "playful" | "aggression";

/** Stems / masks for demo (не полные списки ненормативной лексики). */
const AGGRESSION_STEMS = [
  "бля",
  "блять",
  "сука",
  "сучк",
  "хуй",
  "хуе",
  "хуи",
  "хер ",
  "пизд",
  "ебан",
  "ебал",
  "ебл",
  "мудак",
  "мудил",
  "идиот",
  "дебил",
  "даун",
  "урод",
  "тварь",
  "мраз",
  "гандон",
  "гондон",
  "заеб",
  "нахуй",
  "нахер",
  "пошел на",
  "пошла на",
  "заткни",
  "убить",
  "сдохн",
  "ненавиж",
  "тупой бот",
  "тупой гид",
  "тупая",
  "тупой",
  "отстой",
  "говно",
  "дерьмо",
  "чмо",
  "козёл",
  "козел",
  "дура",
  "дурак",
  "fuck",
  "shit",
  "asshole",
  "bitch",
  "idiot",
  "shut up",
];

const PLAYFUL_STEMS = [
  "любл",
  "любов",
  "влюбл",
  "поцел",
  "свидан",
  "встречаться",
  "женат",
  "замуж",
  "женись",
  "секс",
  "красив",
  "симпт",
  "флирт",
  "знаком",
  "анекдот",
  "шутк",
  "пошути",
  "пошутим",
  "расскажи сказк",
  "ты робот",
  "ты живой",
  "ты человек",
  "ты девушк",
  "ты парен",
  "сколько тебе лет",
  "сколько лет",
  "как дела",
  "что делаешь",
  "скучно",
  "потанцу",
  "мем",
  "лол",
  "ахах",
  "хаха",
  "привет красот",
  "милая",
  "милый бот",
  "милаш",
  "нравишься",
  "давай дружить",
  "будешь моей",
  "будешь моим",
  "отношени",
  "тролл",
  "потролл",
  "глупый вопрос",
];

function normalizeModeration(text: string) {
  return text
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Короткие стемы — только целое слово / начало слова, чтобы «бля» не ловило «влюбляться». */
function hasStem(normalized: string, stem: string) {
  const s = normalizeModeration(stem);
  if (!s) return false;
  if (s.length <= 3) {
    return normalized
      .split(" ")
      .some((w) => w === s || w.startsWith(s));
  }
  return normalized.includes(s);
}

export function classifyUserMessage(text: string): MessageTone {
  const n = normalizeModeration(text);
  if (!n) return "ok";

  // Агрессия всегда важнее флирта
  if (AGGRESSION_STEMS.some((stem) => hasStem(n, stem))) {
    return "aggression";
  }

  if (PLAYFUL_STEMS.some((stem) => hasStem(n, stem))) {
    return "playful";
  }

  return "ok";
}

export const AGGRESSION_WARNING =
  "Давай притормозим. Наша пекарня работает только на волне позитива. Если продолжишь грубить, мне придется заблокировать профиль, и утренний горячий круассан уйдет к другим соседям. Давай общаться вежливо?";

export const CHAT_LOCKED_BANNER =
  "Доступ к чату временно ограничен за нарушение правил сообщества";

export const CALL_HUMAN_LABEL = "🔔 Позвать человека";
export const CALL_GALYA_LABEL = "🔔 Галя, у нас отмена!";

const ORDER_SUGGESTIONS = [
  "Что в меню?",
  "Хочу круассан с лососем на субботу",
  "Как это работает?",
  "Есть ЗОЖ?",
  "КБЖУ всего меню",
];

/** Обычные ответы на нестандарт: юмор + плавный переход к заказу (без кнопки оператора). */
const UNKNOWN_REDIRECTS = [
  "Хм, это вне моей пекарской вселенной 🥐 Давай лучше соберём утро: глянь меню или скажи, что положить в заказ.",
  "Я в круассанах силён, а тут уже философия 😄 Вернёмся к делу — какой день и какая выпечка?",
  "Зафиксировала вопрос… и аккуратно положила его рядом с формой для теста. А заказ пока соберём? Могу подсказать меню или ЗОЖ.",
  "Ого, широкий запрос! Я гид по тёплой доставке, не по всему интернету. Выбери день на сетке или спроси «что в меню?» — поедем к завтраку.",
  "Моих рецептов на это не хватило 😅 Зато на утренний заказ — да. Хочешь круассан, бриошь или маффин?",
  "Интересно, но я лучше веду к оплате до 21:00, чем в дебри темы. Давай оформим день: меню → состав → оплата.",
  "Кажется, мы ушли от печи 🔥 Вернусь к роли гида: подскажу слот, бонусы или добавлю блюдо в заказ — что ближе?",
  "Тут я пас, как круассан без начинки. Зато могу помочь с сеткой дней и составом — с чего начнём?",
];

const UNKNOWN_DIGITAL = [
  "Ух, тут моих цифровых сил не хватает! Давай всё же про завтрак: меню, день или слот — или позови человека из пекарни.",
  "Ух, тут моих цифровых сил не хватает! Могу вернуть нас к заказу — или подключу живого пекаря.",
];

const UNKNOWN_GALYA = [
  "Ой… Я тут бессилен 😅\n\nГаля, у нас отмена! Нужен живой человек — или давай сами соберём заказ по меню.",
  "Стоп. Галя, у нас отмена! Это уже не ко мне. Позвать человека — или вернёмся к круассанам?",
];

export type UnknownGuideReply = {
  text: string;
  unknown: true;
  suggestions: string[];
  action?: { type: "call_human"; label: string };
};

/** Счётчик подряд идущих «мимо» — чтобы кнопка оператора всё же появлялась при упорстве. */
let unknownStreak = 0;
let lastRedirectIndex = -1;

function pickOrderSuggestions(): string[] {
  const pool = [...ORDER_SUGGESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 3);
}

function pickOne(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)]!;
}

function pickRedirect(): string {
  if (UNKNOWN_REDIRECTS.length < 2) return UNKNOWN_REDIRECTS[0]!;
  let idx = Math.floor(Math.random() * UNKNOWN_REDIRECTS.length);
  if (idx === lastRedirectIndex) {
    idx = (idx + 1) % UNKNOWN_REDIRECTS.length;
  }
  lastRedirectIndex = idx;
  return UNKNOWN_REDIRECTS[idx]!;
}

/**
 * Нестандартный вопрос:
 * чаще — разнообразный юмор + перевод к заказу (без кнопки),
 * редко — «цифровых сил» + «Позвать человека»,
 * ещё реже — мем «Галя, у нас отмена!» + кнопка.
 * После 3 «мимо» подряд — эскалация к человеку.
 */
export function buildUnknownReply(): UnknownGuideReply {
  const suggestions = pickOrderSuggestions();
  unknownStreak += 1;

  const forceEscalate = unknownStreak >= 3;
  const roll = Math.random();
  const wantEscalate = forceEscalate || roll < 0.18;

  if (wantEscalate) {
    unknownStreak = 0;
    const useGalya = forceEscalate ? Math.random() < 0.25 : roll < 0.05;
    if (useGalya) {
      return {
        text: pickOne(UNKNOWN_GALYA),
        unknown: true,
        suggestions,
        action: { type: "call_human", label: CALL_GALYA_LABEL },
      };
    }
    return {
      text: pickOne(UNKNOWN_DIGITAL),
      unknown: true,
      suggestions,
      action: { type: "call_human", label: CALL_HUMAN_LABEL },
    };
  }

  return {
    text: pickRedirect(),
    unknown: true,
    suggestions,
  };
}

/** Сброс при обычном FAQ/заказе — чтобы эскалация не копилась зря. */
export function resetUnknownStreak() {
  unknownStreak = 0;
}
export const PLAYFUL_REPLIES = [
  "Ха, ловлю настроение 😄 Но я лучше в круассанах, чем в светских беседах. Давай вернёмся к завтраку — что возьмём на утро?",
  "Ты меня рассмешил(а)! Я всё же гид по выпечке, не по дуэтам. Могу подсказать меню или КБЖУ — что интереснее?",
  "Ок, пофлиртовали с цифровым гидом 🥐 А теперь по делу: слот, меню или бонусы?",
];

export function playfulReply(): string {
  return PLAYFUL_REPLIES[Math.floor(Math.random() * PLAYFUL_REPLIES.length)]!;
}

export const OPERATOR_GREETING =
  "Минутку… Подключаю живого пекаря.\n\nПривет! Я Галя из пекарни 👋 Чем помочь с заказом? Могу подсказать по слоту, составу или бонусам.";

export const OPERATOR_FOLLOWUP =
  "Приняла 👍 Напиши по слоту, составу или оплате — разберём. Если снова нужен гид, нажми «К гиду» сверху.";
