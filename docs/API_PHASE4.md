# API Phase 4 — Админка

## Цель
Панель управления для дипломного демо: блюда, заказы/трекинг, пользователи и бонусы.

## Роли
В `User` добавлено поле `role`: `user` | `admin`.

Демо-аккаунты после seed:
- пользователь: `anna@prosyvaisya.local` / `demo12345`
- админ: `admin@prosyvaisya.local` / `demo12345`

UI: `/admin` (отдельный вход по JWT админа).

## Эндпоинты (все требуют Bearer + role=admin)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/admin/stats` | Счётчики дашборда |
| GET | `/api/v1/admin/dishes` | Все блюда (вкл. скрытые) |
| POST | `/api/v1/admin/dishes` | Создать блюдо |
| PATCH | `/api/v1/admin/dishes/:id` | Обновить блюдо |
| DELETE | `/api/v1/admin/dishes/:id` | Soft-delete (`isActive=false`) |
| GET | `/api/v1/admin/deliveries?from&to&status` | Заказы с user/items/payment |
| PATCH | `/api/v1/admin/deliveries/:id/tracking` | Выставить статус |
| POST | `/api/v1/admin/deliveries/:id/tracking` | Сдвинуть статус на шаг |
| GET | `/api/v1/admin/users` | Пользователи |
| POST | `/api/v1/admin/users/:id/bonuses` | Ручная корректировка бонусов (`manual_adjust`) |

## UI-разделы
1. **Обзор** — статистика
2. **Блюда** — CRUD / скрытие
3. **Заказы** — фильтр статуса, ручной трекинг
4. **Пользователи** — баланс и ± бонусы

## Как проверить
```bash
npx prisma db push
npm run db:seed
npm run dev -- --turbopack
```
Открыть `http://localhost:3000/admin`.
