export * from "./schemas";

/**
 * Domain map (API source of truth)
 *
 * User              — профиль жителя ЖК + баланс бонусов
 * AuthSession       — серверные сессии / JWT refresh (опционально)
 * Subscription      — служебная запись аккаунта (legacy schema; продукт — разовые заказы)
 * Dish              — каталог выпечки
 * Delivery          — доставка на конкретную дату
 * DeliveryItem      — позиции заказа (+ kidsCustom поля)
 * DeliveryTracking  — live-статус / курьер / ETA
 * BonusLedger       — журнал начислений и списаний
 * Feedback          — оценка завтрака после доставки
 */
