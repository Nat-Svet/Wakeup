import type { DeliveryStatus } from "@/types";

export const TRACKER_STATUS_ORDER: DeliveryStatus[] = [
  "mixing",
  "baking",
  "en_route",
  "at_door",
];

export const COURIER = {
  name: "Алексей",
  building: "3-й корпус",
  phone: "+79001234567",
  initials: "А",
};

export const NEIGHBOR_SHARE_BONUS = 50;

/** Demo tick between status steps (ms). */
export const TRACKER_STEP_MS = 4500;

export function getCourierQuote(
  status: DeliveryStatus,
  options: { leaveAtDoor: boolean; silentPush: boolean }
) {
  switch (status) {
    case "mixing":
      return "Замешиваю тесто специально под твой заказ!";
    case "baking":
      return "Уже в печи — пахнет так, что весь двор захочет круассан!";
    case "en_route":
      return "Еду к тебе на велике, выпечка ещё тёплая!";
    case "at_door":
      if (options.leaveAtDoor && options.silentPush) {
        return "Оставил на ручке двери. Тихое уведомление уже у тебя!";
      }
      if (options.leaveAtDoor) {
        return "Пакет на ручке двери — можешь забирать!";
      }
      return "Я у двери, выпечка горячая — открывай!";
    default:
      return "Скоро буду!";
  }
}

/** Approximate arrival from slot like "08:00 - 08:15" → "08:08". */
export function getEtaLabel(timeSlot: string, status: DeliveryStatus) {
  const start = timeSlot?.split(" - ")[0]?.trim();
  if (!start) {
    if (status === "at_door") return "уже здесь";
    return "после выбора слота";
  }
  const [hRaw, mRaw] = start.split(":");
  const hours = Number(hRaw) || 8;
  const minutes = Number(mRaw) || 0;

  if (status === "at_door") return "уже здесь";
  if (status === "mixing") {
    return formatTime(hours, minutes + 12);
  }
  if (status === "baking") {
    return formatTime(hours, minutes + 8);
  }
  return formatTime(hours, minutes + 5);
}

function formatTime(hours: number, minutes: number) {
  const total = hours * 60 + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getMapProgress(status: DeliveryStatus) {
  switch (status) {
    case "mixing":
      return 0.05;
    case "baking":
      return 0.18;
    case "en_route":
      return 0.62;
    case "at_door":
      return 1;
    default:
      return 0;
  }
}

export function nextTrackerStatus(
  status: DeliveryStatus
): DeliveryStatus | null {
  const index = TRACKER_STATUS_ORDER.indexOf(status);
  if (index < 0 || index >= TRACKER_STATUS_ORDER.length - 1) return null;
  return TRACKER_STATUS_ORDER[index + 1];
}
