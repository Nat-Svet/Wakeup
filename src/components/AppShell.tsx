"use client";

import { useEffect, useRef } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SplashScreen } from "@/components/SplashScreen";
import { BottomNav } from "@/components/BottomNav";
import { MobileShell } from "@/components/MobileShell";
import { WeekPage } from "@/components/week/WeekPage";
import { KidsPage } from "@/components/kids/KidsPage";
import { TrackerPage } from "@/components/tracker/TrackerPage";
import { AccountPage } from "@/components/account/AccountPage";
import { AuthGate } from "@/components/auth/AuthGate";
import { KidsQtyWarningModal } from "@/components/week/KidsQtyWarningModal";
import { GuideHost } from "@/components/guide/GuideHost";
import { apiClient } from "@/lib/api-client";
import {
  buildDishIdMaps,
  mapApiDeliveryToUi,
  type ApiDelivery,
  type ApiDish,
} from "@/lib/delivery-map";
import { getDemoWeekDates } from "@/lib/demo-week";

function AuthProfileSync() {
  const { user: authUser, subscription, ready, apiOnline } = useAuth();
  const { applyAuthProfile } = useApp();

  useEffect(() => {
    if (!ready || !apiOnline || !authUser) return;
    applyAuthProfile(authUser, subscription);
  }, [ready, apiOnline, authUser, subscription, applyAuthProfile]);

  return null;
}

function DeliveriesHydrator() {
  const { token, ready, apiOnline } = useAuth();
  const {
    hydrateFromApi,
    apiSynced,
    markDeliveryPaid,
    resetClientSession,
  } = useApp();
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    if (prevTokenRef.current === undefined) {
      prevTokenRef.current = token;
      if (!token) return;
    } else if (prevTokenRef.current !== token) {
      prevTokenRef.current = token;
      resetClientSession();
      if (!token) return;
    }
  }, [ready, token, resetClientSession]);

  useEffect(() => {
    if (!ready || !apiOnline || !token || apiSynced) return;
    let cancelled = false;

    async function load() {
      try {
        const dishes = (await apiClient.getDishes()) as ApiDish[];
        const maps = buildDishIdMaps(dishes);
        const weekDates = getDemoWeekDates();
        const [raw, payments] = await Promise.all([
          apiClient.getDeliveries(token!, {
            from: weekDates[0],
            to: weekDates[weekDates.length - 1],
          }) as Promise<ApiDelivery[]>,
          apiClient.getPayments(token!),
        ]);
        if (cancelled) return;
        const mapped = raw
          .map((d) => mapApiDeliveryToUi(d, maps))
          .filter((d) => d.date >= weekDates[0]!);
        if (mapped.length === 0) {
          // Still mark synced so we don't spin; shells stay local until next login
          hydrateFromApi({ token: token!, maps }, [], new Set());
          return;
        }

        const paidIds = new Set<string>();
        for (const payment of payments.payments) {
          if (payment.status === "paid") {
            paidIds.add(payment.deliveryId);
            markDeliveryPaid(payment.deliveryId, {
              receipt: payment.receiptCode ?? true,
              itemsTotal: payment.itemsTotal,
              bonusSpent: payment.bonusSpent,
              amountPaid: payment.amountPaid,
              paymentId: payment.id,
            });
          }
        }

        hydrateFromApi({ token: token!, maps }, mapped, paidIds);
      } catch (error) {
        console.warn("Failed to hydrate deliveries from API", error);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    ready,
    apiOnline,
    token,
    apiSynced,
    hydrateFromApi,
    markDeliveryPaid,
  ]);

  return null;
}

function AppContent() {
  const { activeTab, showSplash, authOpen, setAuthOpen, setActiveTab } =
    useApp();
  const { ready, token } = useAuth();
  const wasGuestRef = useRef(true);

  // Гость → вход: закрыть форму и открыть «Неделю»
  useEffect(() => {
    if (!ready) return;
    if (token) {
      setAuthOpen(false);
      if (wasGuestRef.current) setActiveTab("week");
      wasGuestRef.current = false;
    } else {
      wasGuestRef.current = true;
    }
  }, [ready, token, setAuthOpen, setActiveTab]);

  if (!ready) {
    return (
      <MobileShell>
        <div className="flex min-h-dvh items-center justify-center text-sm font-bold text-[#8B6B5A]">
          Загрузка…
        </div>
      </MobileShell>
    );
  }

  // 1) Splash для всех
  if (showSplash) {
    return (
      <MobileShell>
        <SplashScreen />
      </MobileShell>
    );
  }

  // 2) Гость может полистать; с аккаунтом — сразу «Неделя» и остальное
  return (
    <MobileShell>
      {activeTab === "week" && <WeekPage />}
      {activeTab === "kids" && <KidsPage />}
      {activeTab === "tracker" && <TrackerPage />}
      {activeTab === "account" && <AccountPage />}
      <BottomNav />
      <KidsQtyWarningModal />
      <GuideHost />
      {authOpen && !token && (
        <AuthGate onClose={() => setAuthOpen(false)} />
      )}
    </MobileShell>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthProfileSync />
        <DeliveriesHydrator />
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
