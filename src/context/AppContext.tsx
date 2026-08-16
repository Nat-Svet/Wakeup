"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENT_USER,
  getInitialDeliveries,
  KIDS_SHAPE_TO_DISH,
  MAX_ITEM_QUANTITY,
  SUBSCRIPTION,
  createItemId,
  sameKidsCustom,
  hasPendingKidsQuantity,
  upsertAdultDeliveryItem,
} from "@/data/db";
import type {
  BunShape,
  Delivery,
  DeliveryItem,
  DeliveryStatus,
  GlazeColor,
  KidsCustom,
  SecretFilling,
  Subscription,
  TabId,
  User,
} from "@/types";
import { NEIGHBOR_SHARE_BONUS } from "@/data/tracker";
import { apiClient } from "@/lib/api-client";
import {
  mapApiDeliveryToUi,
  mapUiItemsToApiPayload,
  localDeliveryDateById,
  type ApiDelivery,
  type DishIdMaps,
} from "@/lib/delivery-map";
import {
  getDefaultSelectedDayId,
  mergeWeekDeliveries,
} from "@/lib/week-dates";

interface KidsOrder {
  shape: BunShape;
  glaze: GlazeColor;
  filling: SecretFilling;
  sentForDayId: string | null;
}

type ApiBridge = {
  token: string;
  maps: DishIdMaps;
};

function asWeekDraft(delivery: Delivery): Delivery {
  return {
    ...delivery,
    items: [],
    leaveAtDoor: false,
    silentPush: false,
  };
}

function asTrackerDay(delivery: Delivery, paid: boolean): Delivery {
  if (paid) return delivery;
  return { ...delivery, items: [] };
}

export type DayPaymentSummary = {
  itemsTotal: number;
  bonusSpent: number;
  amountPaid: number;
  receiptCode: string | null;
  /** ID оплаты в API — для скачивания того же чека, что в модалке оплаты */
  paymentId: string | null;
};

type PaidMarkInput = {
  receipt?: string | true | null;
  itemsTotal?: number;
  bonusSpent?: number;
  amountPaid?: number;
  paymentId?: string | null;
};

interface AppContextValue {
  user: User;
  subscription: Subscription;
  /** Week tab draft — local only until checkout; cleared after pay / on hydrate. */
  deliveries: Delivery[];
  /** Tracker tab — committed (paid) orders from API. */
  trackerDeliveries: Delivery[];
  selectedDayId: string;
  activeTab: TabId;
  showSplash: boolean;
  kidsOrder: KidsOrder;
  replaceOpen: boolean;
  alarmSaved: boolean;
  flowHint: string | null;
  clearFlowHint: () => void;
  apiSynced: boolean;
  kidsQtyWarningOpen: boolean;
  checkoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
  /** Показать экран входа / регистрации (гость полистал → хочет аккаунт). */
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  openCheckout: () => void;
  markDeliveryPaid: (
    deliveryId: string,
    receiptOrPayment?: string | true | PaidMarkInput
  ) => void;
  /** Push week draft to API, then move it into tracker and clear the week day. */
  finalizePaidDelivery: (
    deliveryId: string,
    receiptOrPayment?: string | true | PaidMarkInput
  ) => Promise<void>;
  syncWeekDraftToApi: (deliveryId: string) => Promise<void>;
  isDeliveryPaid: (deliveryId: string) => boolean;
  getPaidReceipt: (deliveryId: string) => string | null;
  getPaidPayment: (deliveryId: string) => DayPaymentSummary | null;
  setActiveTab: (tab: TabId) => void;
  setSelectedDayId: (id: string) => void;
  dismissSplash: () => void;
  setReplaceOpen: (open: boolean) => void;
  saveDayItems: (items: DeliveryItem[]) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  /** Add/increase an adult dish on a specific week day (guide / quick actions). */
  addDishToDay: (
    deliveryId: string,
    dishId: string,
    quantity?: number
  ) => void;
  updateTimeSlot: (slot: string) => void;
  saveAlarm: () => void;
  toggleLeaveAtDoor: () => void;
  toggleSilentPush: () => void;
  pauseSubscription: () => void;
  resumeSubscription: () => void;
  setKidsShape: (shape: BunShape) => void;
  setKidsGlaze: (glaze: GlazeColor) => void;
  setKidsFilling: (filling: SecretFilling) => void;
  sendKidsConstructionToParent: () => void;
  selectedDelivery: Delivery;
  trackerSelectedDelivery: Delivery;
  todayDelivery: Delivery;
  updateDeliveryStatus: (deliveryId: string, status: DeliveryStatus) => void;
  awardNeighborShareBonus: (deliveryId: string) => boolean;
  resetTrackerDemo: (deliveryId: string) => void;
  neighborBonusAwardedFor: Record<string, boolean>;
  addBonus: (amount: number) => void;
  setBonusBalance: (balance: number) => void;
  setNeighborBonusAwarded: (deliveryId: string, awarded: boolean) => void;
  hydrateFromApi: (
    bridge: ApiBridge,
    deliveries: Delivery[],
    paidIds?: Set<string>
  ) => void;
  mergeApiDelivery: (api: ApiDelivery) => void;
  resetClientSession: () => void;
  applyAuthProfile: (
    authUser: {
      id: string;
      name: string;
      city: string;
      street: string;
      building: string;
      apartment: string;
      bonusBalance: number;
      avatarInitials: string;
    },
    sub?: {
      id: string;
      userId: string;
      active: boolean;
      paused: boolean;
      price: number;
    } | null
  ) => void;
  dismissKidsQtyWarning: () => void;
  fixPendingKidsQuantity: () => void;
  openKidsQtyWarning: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(CURRENT_USER);
  const [subscription, setSubscription] = useState(SUBSCRIPTION);
  const [deliveries, setDeliveries] = useState(getInitialDeliveries);
  const [trackerDeliveries, setTrackerDeliveries] =
    useState(getInitialDeliveries);
  const [selectedDayId, setSelectedDayIdState] = useState(() =>
    getDefaultSelectedDayId(getInitialDeliveries())
  );  const [activeTab, setActiveTabState] = useState<TabId>("week");
  const [showSplash, setShowSplash] = useState(true);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [alarmSaved, setAlarmSaved] = useState(false);
  const [alarmSavedForId, setAlarmSavedForId] = useState<string | null>(null);
  const [flowHint, setFlowHint] = useState<string | null>(null);
  const [apiSynced, setApiSynced] = useState(false);
  const [kidsQtyWarningOpen, setKidsQtyWarningOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [paidByDeliveryId, setPaidByDeliveryId] = useState<
    Record<string, string | true>
  >({});
  const [paymentByDeliveryId, setPaymentByDeliveryId] = useState<
    Record<string, DayPaymentSummary>
  >({});
  const [kidsOrder, setKidsOrder] = useState<KidsOrder>({
    shape: "bunny",
    glaze: "raspberry",
    filling: "caramel",
    sentForDayId: null,
  });
  const [neighborBonusAwardedFor, setNeighborBonusAwardedFor] = useState<
    Record<string, boolean>
  >({});

  const apiBridgeRef = useRef<ApiBridge | null>(null);
  const selectedDayIdRef = useRef(selectedDayId);
  selectedDayIdRef.current = selectedDayId;
  const deliveriesRef = useRef(deliveries);
  deliveriesRef.current = deliveries;
  const paidByDeliveryIdRef = useRef(paidByDeliveryId);
  paidByDeliveryIdRef.current = paidByDeliveryId;

  const selectedDelivery = useMemo(() => {
    return deliveries.find((d) => d.id === selectedDayId) ?? deliveries[0];
  }, [deliveries, selectedDayId]);

  const trackerSelectedDelivery = useMemo(() => {
    return (
      trackerDeliveries.find((d) => d.id === selectedDayId) ??
      trackerDeliveries[0]
    );
  }, [trackerDeliveries, selectedDayId]);

  const todayDelivery = useMemo(() => {
    return (
      trackerDeliveries.find((d) => d.isToday) ??
      deliveries.find((d) => d.isToday) ??
      deliveries[0]
    );
  }, [trackerDeliveries, deliveries]);

  const requireKidsQuantities = useCallback(
    (delivery: Delivery = selectedDelivery) => {
      if (!hasPendingKidsQuantity(delivery.items)) return true;
      setKidsQtyWarningOpen(true);
      return false;
    },
    [selectedDelivery]
  );

  const setActiveTab = useCallback((tab: TabId) => {
    // Tracker is always browsable; kids qty only blocks checkout/alarm
    setActiveTabState(tab);
  }, []);

  const setSelectedDayId = useCallback(
    (id: string) => {
      const day = deliveriesRef.current.find((d) => d.id === id);
      if (day?.orderDisabled) {
        setFlowHint(
          day.isToday
            ? "Заказ день в день недоступен — кухня печёт ночью под заказы накануне"
            : day.isTomorrow
              ? "Дедлайн 21:00 пройден — на завтрашнее утро заказы закрыты"
              : "Этот день вне окна планирования (6 дней с ближайшего доступного)"
        );
        return;
      }
      setSelectedDayIdState(id);
      setFlowHint(null);
    },
    []
  );

  // Актуализируем блокировки при смене суток / после 21:00
  useEffect(() => {
    const refresh = () => {
      setDeliveries((prev) => {
        const merged = mergeWeekDeliveries(prev);
        setSelectedDayIdState((current) => {
          const stillOk = merged.find(
            (d) => d.id === current && !d.orderDisabled
          );
          if (stillOk) return current;
          return getDefaultSelectedDayId(merged);
        });
        return merged;
      });
      setTrackerDeliveries((prev) => mergeWeekDeliveries(prev));
    };
    refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dismissKidsQtyWarning = useCallback(() => {
    setKidsQtyWarningOpen(false);
  }, []);

  const openKidsQtyWarning = useCallback(() => {
    setKidsQtyWarningOpen(true);
  }, []);

  const fixPendingKidsQuantity = useCallback(() => {
    setKidsQtyWarningOpen(false);
    setActiveTabState("week");
    window.setTimeout(() => {
      document.getElementById("pending-kids-qty")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
  }, []);

  const clearFlowHint = useCallback(() => setFlowHint(null), []);

  const openCheckout = useCallback(() => {
    const day =
      deliveries.find((d) => d.id === selectedDayIdRef.current) ??
      selectedDelivery;
    if (day.orderDisabled) {
      setFlowHint(
        day.isToday
          ? "Заказ день в день недоступен — печём ночью под заказы накануне"
          : "На этот день заказ закрыт — выбери активный день в календаре"
      );
      return;
    }
    if (paidByDeliveryIdRef.current[day.id]) {
      setCheckoutOpen(true);
      return;
    }
    if (!requireKidsQuantities(day)) return;
    const hasItems = day.items.some((item) => item.quantity > 0);
    if (!hasItems) {
      setFlowHint("Сначала добавь выпечку в заказ, затем оплати");
      window.setTimeout(() => setFlowHint(null), 3200);
      return;
    }
    setFlowHint(null);
    setCheckoutOpen(true);
  }, [deliveries, selectedDelivery, requireKidsQuantities]);

  const applyPaidMark = useCallback(
    (deliveryId: string, receiptOrPayment?: string | true | PaidMarkInput) => {
      const input: PaidMarkInput =
        typeof receiptOrPayment === "object" && receiptOrPayment !== null
          ? receiptOrPayment
          : { receipt: receiptOrPayment ?? true };

      const receipt =
        input.receipt === undefined || input.receipt === null
          ? true
          : input.receipt;

      setPaidByDeliveryId((prev) => ({ ...prev, [deliveryId]: receipt }));

      if (
        typeof input.itemsTotal === "number" &&
        typeof input.bonusSpent === "number" &&
        typeof input.amountPaid === "number"
      ) {
        setPaymentByDeliveryId((prev) => ({
          ...prev,
          [deliveryId]: {
            itemsTotal: input.itemsTotal!,
            bonusSpent: input.bonusSpent!,
            amountPaid: input.amountPaid!,
            receiptCode: typeof receipt === "string" ? receipt : null,
            paymentId: input.paymentId ?? prev[deliveryId]?.paymentId ?? null,
          },
        }));
      } else if (input.paymentId) {
        setPaymentByDeliveryId((prev) => {
          const existing = prev[deliveryId];
          if (!existing) {
            return {
              ...prev,
              [deliveryId]: {
                itemsTotal: 0,
                bonusSpent: 0,
                amountPaid: 0,
                receiptCode: typeof receipt === "string" ? receipt : null,
                paymentId: input.paymentId!,
              },
            };
          }
          return {
            ...prev,
            [deliveryId]: {
              ...existing,
              paymentId: input.paymentId!,
              receiptCode:
                typeof receipt === "string" ? receipt : existing.receiptCode,
            },
          };
        });
      }
    },
    []
  );

  const markDeliveryPaid = useCallback(
    (deliveryId: string, receiptOrPayment?: string | true | PaidMarkInput) => {
      applyPaidMark(deliveryId, receiptOrPayment);
    },
    [applyPaidMark]
  );

  const isDeliveryPaid = useCallback(
    (deliveryId: string) => Boolean(paidByDeliveryId[deliveryId]),
    [paidByDeliveryId]
  );

  const getPaidReceipt = useCallback(
    (deliveryId: string) => {
      const value = paidByDeliveryId[deliveryId];
      return typeof value === "string" ? value : null;
    },
    [paidByDeliveryId]
  );

  const getPaidPayment = useCallback(
    (deliveryId: string) => paymentByDeliveryId[deliveryId] ?? null,
    [paymentByDeliveryId]
  );

  const hydrateFromApi = useCallback(
    (
      bridge: ApiBridge,
      nextDeliveries: Delivery[],
      paidIds: Set<string> = new Set()
    ) => {
      apiBridgeRef.current = bridge;
      if (nextDeliveries.length === 0) {
        setApiSynced(true);
        return;
      }

      const currentId = selectedDayIdRef.current;
      const previousDate =
        localDeliveryDateById(currentId) ??
        nextDeliveries.find((d) => d.id === currentId)?.date ??
        null;

      const preferred =
        (previousDate
          ? nextDeliveries.find((d) => d.date === previousDate)
          : null) ??
        nextDeliveries.find((d) => d.id === currentId) ??
        nextDeliveries.find((d) => d.isNearestBreakfast) ??
        nextDeliveries.find((d) => !d.orderDisabled) ??
        nextDeliveries[0];

      const weekMerged = mergeWeekDeliveries(nextDeliveries.map(asWeekDraft));
      const trackerMerged = mergeWeekDeliveries(
        nextDeliveries.map((d) => asTrackerDay(d, paidIds.has(d.id)))
      );

      setDeliveries(weekMerged);
      setTrackerDeliveries(trackerMerged);

      const preferredInWindow =
        (preferred &&
          weekMerged.find(
            (d) => d.date === preferred.date && !d.orderDisabled
          )) ??
        weekMerged.find((d) => d.isNearestBreakfast && !d.orderDisabled) ??
        weekMerged.find((d) => !d.orderDisabled) ??
        weekMerged[0];
      if (preferredInWindow) setSelectedDayIdState(preferredInWindow.id);
      setApiSynced(true);
    },
    []
  );

  const resetClientSession = useCallback(() => {
    apiBridgeRef.current = null;
    setApiSynced(false);
    setPaidByDeliveryId({});
    setPaymentByDeliveryId({});
    const week = getInitialDeliveries();
    setDeliveries(week);
    setTrackerDeliveries(week);
    setSelectedDayIdState(getDefaultSelectedDayId(week));
    setNeighborBonusAwardedFor({});
    setCheckoutOpen(false);
    setKidsQtyWarningOpen(false);
    setReplaceOpen(false);
    setActiveTabState("week");
  }, []);

  const applyAuthProfile = useCallback(
    (
      authUser: {
        id: string;
        name: string;
        city: string;
        street: string;
        building: string;
        apartment: string;
        bonusBalance: number;
        avatarInitials: string;
      },
      sub?: {
        id: string;
        userId: string;
        active: boolean;
        paused: boolean;
        price: number;
      } | null
    ) => {
      setUser({
        id: authUser.id,
        name: authUser.name,
        city: authUser.city,
        street: authUser.street,
        building: authUser.building,
        apartment: authUser.apartment,
        bonusBalance: authUser.bonusBalance,
        avatarInitials: authUser.avatarInitials,
      });
      if (sub) {
        setSubscription({
          id: sub.id,
          userId: sub.userId,
          active: sub.active,
          paused: sub.paused,
          price: sub.price,
        });
      }
    },
    []
  );

  const mergeApiDelivery = useCallback((api: ApiDelivery) => {
    const bridge = apiBridgeRef.current;
    if (!bridge) return;
    const mapped = mapApiDeliveryToUi(api, bridge.maps);
    const paid = Boolean(paidByDeliveryIdRef.current[mapped.id]);

    // Tracker holds committed order contents; week stays a draft (no item overwrite)
    setTrackerDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== mapped.id && d.date !== mapped.date) return d;
        return paid || mapped.items.length > 0
          ? mapped
          : { ...mapped, items: d.items };
      })
    );
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== mapped.id && d.date !== mapped.date) return d;
        return {
          ...d,
          id: mapped.id,
          status: mapped.status,
          timeSlot: mapped.timeSlot,
          leaveAtDoor: mapped.leaveAtDoor,
          silentPush: mapped.silentPush,
          // never refill week items from API
        };
      })
    );
  }, []);

  const pushItems = useCallback(
    async (deliveryId: string, items: DeliveryItem[]) => {
      const bridge = apiBridgeRef.current;
      if (!bridge) return;
      try {
        const payload = mapUiItemsToApiPayload(items, bridge.maps);
        const updated = (await apiClient.putDeliveryItems(
          bridge.token,
          deliveryId,
          {
            items: payload,
          }
        )) as ApiDelivery;
        mergeApiDelivery(updated);
      } catch (error) {
        console.warn("Failed to sync delivery items", error);
        throw error;
      }
    },
    [mergeApiDelivery]
  );

  const pushDeliveryMeta = useCallback(
    async (
      deliveryId: string,
      patch: Partial<Pick<Delivery, "timeSlot" | "leaveAtDoor" | "silentPush">>
    ) => {
      const bridge = apiBridgeRef.current;
      if (!bridge) return;
      try {
        const updated = (await apiClient.updateDelivery(
          bridge.token,
          deliveryId,
          patch
        )) as ApiDelivery;
        mergeApiDelivery(updated);
      } catch (error) {
        console.warn("Failed to sync delivery meta", error);
      }
    },
    [mergeApiDelivery]
  );

  const syncWeekDraftToApi = useCallback(
    async (deliveryId: string) => {
      const day = deliveriesRef.current.find((d) => d.id === deliveryId);
      if (!day) return;
      await pushItems(deliveryId, day.items);
      await pushDeliveryMeta(deliveryId, {
        timeSlot: day.timeSlot,
        leaveAtDoor: day.leaveAtDoor,
        silentPush: day.silentPush,
      });
    },
    [pushItems, pushDeliveryMeta]
  );

  const finalizePaidDelivery = useCallback(
    async (
      deliveryId: string,
      receiptOrPayment?: string | true | PaidMarkInput
    ) => {
      const day = deliveriesRef.current.find((d) => d.id === deliveryId);
      applyPaidMark(deliveryId, receiptOrPayment);
      if (day) {
        const committed = {
          ...day,
          // Слот выбирают после оплаты — не тащим дефолт в трекер
          timeSlot: "",
          items: day.items.map((item) => ({ ...item })),
        };
        setTrackerDeliveries((prev) =>
          prev.map((d) => (d.id === deliveryId ? committed : d))
        );
      }
      // Clear week draft items; slot задаётся в «Умный будильник»
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === deliveryId ? { ...d, items: [], timeSlot: "" } : d
        )
      );
    },
    [applyPaidMark]
  );

  const dismissSplash = useCallback(() => setShowSplash(false), []);

  const saveDayItems = useCallback(
    (items: DeliveryItem[]) => {
      const kidsItems = selectedDelivery.items.filter((item) => item.kidsCustom);
      const adultItems = items.filter(
        (item) => !item.kidsCustom && item.quantity > 0
      );
      const next = [...adultItems, ...kidsItems];
      setDeliveries((prev) =>
        prev.map((d) => (d.id === selectedDayId ? { ...d, items: next } : d))
      );
      setReplaceOpen(false);
      // Draft stays local until checkout
    },
    [selectedDayId, selectedDelivery.items]
  );

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const clamped = Math.max(0, Math.min(MAX_ITEM_QUANTITY, quantity));
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id !== selectedDayId) return d;
          const target = d.items.find((item) => item.id === itemId);
          if (!target) return d;

          if (target.kidsCustom) {
            if (clamped <= 0 && target.quantity === 0) {
              return {
                ...d,
                items: d.items.filter((item) => item.id !== itemId),
              };
            }
            return {
              ...d,
              items: d.items.map((item) =>
                item.id === itemId ? { ...item, quantity: clamped } : item
              ),
            };
          }

          if (clamped <= 0) {
            return {
              ...d,
              items: d.items.filter((item) => item.id !== itemId),
            };
          }

          return {
            ...d,
            items: d.items.map((item) =>
              item.id === itemId ? { ...item, quantity: clamped } : item
            ),
          };
        })
      );
    },
    [selectedDayId]
  );

  const addDishToDay = useCallback(
    (deliveryId: string, dishId: string, quantity = 1) => {
      const targetDay = deliveriesRef.current.find((d) => d.id === deliveryId);
      if (targetDay?.orderDisabled) {
        setFlowHint(
          "На этот день заказ недоступен — выбери день с меткой «Ближайший завтрак» или другой активный"
        );
        return;
      }
      setSelectedDayIdState(deliveryId);
      setDeliveries((prev) =>
        prev.map((d) => {
          if (d.id !== deliveryId) return d;
          const existing = d.items.find(
            (item) => item.dishId === dishId && !item.kidsCustom
          );
          const nextQty = Math.min(
            MAX_ITEM_QUANTITY,
            (existing?.quantity ?? 0) + Math.max(1, quantity)
          );
          return {
            ...d,
            items: upsertAdultDeliveryItem(d.items, dishId, nextQty),
          };
        })
      );
    },
    []
  );

  const updateTimeSlot = useCallback(
    (slot: string) => {
      if (!paidByDeliveryId[selectedDayId]) return;
      setAlarmSaved(false);
      setAlarmSavedForId(null);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === selectedDayId ? { ...d, timeSlot: slot } : d
        )
      );
      setTrackerDeliveries((prev) =>
        prev.map((d) =>
          d.id === selectedDayId ? { ...d, timeSlot: slot } : d
        )
      );
      void pushDeliveryMeta(selectedDayId, { timeSlot: slot });
    },
    [selectedDayId, pushDeliveryMeta, paidByDeliveryId]
  );

  const saveAlarm = useCallback(() => {
    if (!paidByDeliveryId[selectedDayId]) return;
    if (!requireKidsQuantities()) return;
    setAlarmSaved(true);
    setAlarmSavedForId(selectedDayId);
  }, [requireKidsQuantities, paidByDeliveryId, selectedDayId]);

  const toggleLeaveAtDoor = useCallback(() => {
    setDeliveries((prev) => {
      const next = prev.map((d) =>
        d.id === selectedDayId ? { ...d, leaveAtDoor: !d.leaveAtDoor } : d
      );
      const day = next.find((d) => d.id === selectedDayId);
      if (day) {
        setTrackerDeliveries((trackerPrev) =>
          trackerPrev.map((d) =>
            d.id === selectedDayId
              ? { ...d, leaveAtDoor: day.leaveAtDoor }
              : d
          )
        );
        // Sync concierge to API only after the day is paid / committed
        if (paidByDeliveryIdRef.current[selectedDayId]) {
          void pushDeliveryMeta(day.id, { leaveAtDoor: day.leaveAtDoor });
        }
      }
      return next;
    });
  }, [selectedDayId, pushDeliveryMeta]);

  const toggleSilentPush = useCallback(() => {
    setDeliveries((prev) => {
      const next = prev.map((d) =>
        d.id === selectedDayId ? { ...d, silentPush: !d.silentPush } : d
      );
      const day = next.find((d) => d.id === selectedDayId);
      if (day) {
        setTrackerDeliveries((trackerPrev) =>
          trackerPrev.map((d) =>
            d.id === selectedDayId ? { ...d, silentPush: day.silentPush } : d
          )
        );
        if (paidByDeliveryIdRef.current[selectedDayId]) {
          void pushDeliveryMeta(day.id, { silentPush: day.silentPush });
        }
      }
      return next;
    });
  }, [selectedDayId, pushDeliveryMeta]);

  const pauseSubscription = useCallback(() => {
    setSubscription((prev) => ({ ...prev, paused: true, active: false }));
    const bridge = apiBridgeRef.current;
    if (bridge) {
      void apiClient.pauseSubscription(bridge.token).catch((error) => {
        console.warn("pauseSubscription failed", error);
      });
    }
  }, []);

  const resumeSubscription = useCallback(() => {
    setSubscription((prev) => ({ ...prev, paused: false, active: true }));
    const bridge = apiBridgeRef.current;
    if (bridge) {
      void apiClient.resumeSubscription(bridge.token).catch((error) => {
        console.warn("resumeSubscription failed", error);
      });
    }
  }, []);

  const setKidsShape = useCallback((shape: BunShape) => {
    setKidsOrder((prev) => ({ ...prev, shape, sentForDayId: null }));
  }, []);

  const setKidsGlaze = useCallback((glaze: GlazeColor) => {
    setKidsOrder((prev) => ({ ...prev, glaze, sentForDayId: null }));
  }, []);

  const setKidsFilling = useCallback((filling: SecretFilling) => {
    setKidsOrder((prev) => ({ ...prev, filling, sentForDayId: null }));
  }, []);

  const sendKidsConstructionToParent = useCallback(() => {
    const dishId = KIDS_SHAPE_TO_DISH[kidsOrder.shape];
    const kidsCustom: KidsCustom = {
      shape: kidsOrder.shape,
      glaze: kidsOrder.glaze,
      filling: kidsOrder.filling,
    };

    // Kids constructions stay in the week draft until checkout
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDayId) return d;
        const existing = d.items.find(
          (item) =>
            item.kidsCustom && sameKidsCustom(item.kidsCustom, kidsCustom)
        );
        if (existing) return d;
        return {
          ...d,
          items: [
            ...d.items,
            {
              id: createItemId(),
              dishId,
              quantity: 0,
              kidsCustom,
            },
          ],
        };
      })
    );
    setUser((prev) => ({
      ...prev,
      bonusBalance: prev.bonusBalance + 20,
    }));

    setKidsOrder((prev) => ({ ...prev, sentForDayId: selectedDayId }));

    window.setTimeout(() => {
      setKidsOrder((prev) =>
        prev.sentForDayId === selectedDayId
          ? { ...prev, sentForDayId: null }
          : prev
      );
    }, 1800);
  }, [
    selectedDayId,
    kidsOrder.shape,
    kidsOrder.glaze,
    kidsOrder.filling,
  ]);

  const updateDeliveryStatus = useCallback(
    (deliveryId: string, status: DeliveryStatus) => {
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, status } : d))
      );
      setTrackerDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, status } : d))
      );
    },
    []
  );

  const awardNeighborShareBonus = useCallback((deliveryId: string) => {
    let awarded = false;
    setNeighborBonusAwardedFor((prev) => {
      if (prev[deliveryId]) return prev;
      awarded = true;
      return { ...prev, [deliveryId]: true };
    });
    if (awarded) {
      setUser((prev) => ({
        ...prev,
        bonusBalance: prev.bonusBalance + NEIGHBOR_SHARE_BONUS,
      }));
    }
    return awarded;
  }, []);

  const resetTrackerDemo = useCallback((deliveryId: string) => {
    setNeighborBonusAwardedFor((prev) => {
      const next = { ...prev };
      delete next[deliveryId];
      return next;
    });
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, status: "mixing" as const } : d
      )
    );
    setTrackerDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId ? { ...d, status: "mixing" as const } : d
      )
    );
  }, []);

  const addBonus = useCallback((amount: number) => {
    setUser((prev) => ({
      ...prev,
      bonusBalance: prev.bonusBalance + amount,
    }));
  }, []);

  const setBonusBalance = useCallback((balance: number) => {
    setUser((prev) => ({ ...prev, bonusBalance: balance }));
  }, []);

  const setNeighborBonusAwarded = useCallback(
    (deliveryId: string, awarded: boolean) => {
      setNeighborBonusAwardedFor((prev) => {
        if (awarded) return { ...prev, [deliveryId]: true };
        const next = { ...prev };
        delete next[deliveryId];
        return next;
      });
    },
    []
  );

  const value: AppContextValue = {
    user,
    subscription,
    deliveries,
    trackerDeliveries,
    selectedDayId,
    activeTab,
    showSplash,
    kidsOrder,
    replaceOpen,
    alarmSaved: alarmSaved && alarmSavedForId === selectedDayId,
    flowHint,
    clearFlowHint,
    apiSynced,
    kidsQtyWarningOpen,
    checkoutOpen,
    setCheckoutOpen,
    authOpen,
    setAuthOpen,
    openCheckout,
    markDeliveryPaid,
    finalizePaidDelivery,
    syncWeekDraftToApi,
    isDeliveryPaid,
    getPaidReceipt,
    getPaidPayment,
    setActiveTab,
    setSelectedDayId,
    dismissSplash,
    setReplaceOpen,
    saveDayItems,
    updateItemQuantity,
    addDishToDay,
    updateTimeSlot,
    saveAlarm,
    toggleLeaveAtDoor,
    toggleSilentPush,
    pauseSubscription,
    resumeSubscription,
    setKidsShape,
    setKidsGlaze,
    setKidsFilling,
    sendKidsConstructionToParent,
    selectedDelivery,
    trackerSelectedDelivery,
    todayDelivery,
    updateDeliveryStatus,
    awardNeighborShareBonus,
    resetTrackerDemo,
    neighborBonusAwardedFor,
    addBonus,
    setBonusBalance,
    setNeighborBonusAwarded,
    hydrateFromApi,
    mergeApiDelivery,
    resetClientSession,
    applyAuthProfile,
    dismissKidsQtyWarning,
    fixPendingKidsQuantity,
    openKidsQtyWarning,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
