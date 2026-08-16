# API Preparation — «Просыпайся!»

## Выбранный стек
- **API:** Next.js App Router Route Handlers (`/api/v1/*`)
- **БД:** PostgreSQL + Prisma ORM
- **Валидация:** Zod (`src/domain/schemas.ts`)
- **Auth (MVP):** email + password, JWT (`jose`) + опциональные `AuthSession` в БД
- **Локальная БД:** Docker Compose (`docker-compose.yml`)

## Окружения
| APP_ENV | Назначение | Файл-пример |
|---------|------------|-------------|
| `dev`   | локальная разработка | `.env.development.example` → `.env.local` |
| `stage` | предпрод | `.env.example` + отдельные секреты |
| `prod`  | прод | секреты только в CI/hosting |

Обязательные переменные: `DATABASE_URL`, `JWT_SECRET` (≥32 символов).

## Доменные сущности
- `User`, `AuthSession`
- `Subscription`
- `Dish`
- `Delivery`, `DeliveryItem` (kids: shape/glaze/filling)
- `DeliveryTracking`
- `BonusLedger`
- `Feedback`

Схемы Zod: `src/domain/schemas.ts`  
Prisma: `prisma/schema.prisma`

## Эндпоинты
- `GET /api/health` — готовность конфигурации
- `POST /api/v1/auth/register|login`
- `GET|PATCH /api/v1/me`
- `GET /api/v1/dishes`
- `GET /api/v1/subscription`, `POST .../pause|resume`
- `GET /api/v1/deliveries`, `PATCH /api/v1/deliveries/:id`
- `PUT /api/v1/deliveries/:id/items`
- `POST /api/v1/deliveries/:id/kids-items`
- `GET|PATCH /api/v1/deliveries/:id/tracking`
- `POST /api/v1/deliveries/:id/tracking/advance|reset`
- `GET /api/v1/deliveries/:id/tracking/stream` (SSE)
- `GET|POST /api/v1/bonuses`
- `POST /api/v1/feedback`

Этап 2 (трекер): [docs/API_PHASE2.md](./API_PHASE2.md)  
Этап 3 (оплата): [docs/API_PHASE3.md](./API_PHASE3.md)  
Этап 4 (админка): [docs/API_PHASE4.md](./API_PHASE4.md)

## Как поднять MVP локально (SQLite, без Docker)
```bash
copy .env.development.example .env.local
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Демо-логин после seed:
- email: `anna@prosyvaisya.local`
- password: `demo12345`
- админ: `admin@prosyvaisya.local` / `demo12345` → UI `/admin`

В приложении: экран входа/регистрации, вкладка «Профиль», выход.
Кнопка «Войти как Анна (демо)» на экране входа.

Проверка:
- `GET http://localhost:3000/api/health`
- `POST http://localhost:3000/api/v1/auth/login`
