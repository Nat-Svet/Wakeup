# Просыпайся!

Интерактивное приложение тёплой выпечки с доставкой к пробуждению.

## Стек
- Next.js 15 (App Router) + React + TypeScript + Tailwind
- API: Route Handlers `/api/v1/*` + Prisma + SQLite (локально)
- Auth: JWT (email/password)

## Запуск
```bash
copy .env.development.example .env.local
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

- UI: http://localhost:3000  
- Health: http://localhost:3000/api/health  

Демо API:
- email: `anna@prosyvaisya.local`
- password: `demo12345`

Документация API:
- [docs/API_PREP.md](docs/API_PREP.md) — подготовка и MVP
- [docs/API_PHASE2.md](docs/API_PHASE2.md) — трекер / логистика
- [docs/API_PHASE3.md](docs/API_PHASE3.md) — оплата / бонусы

> Этап 3: оплата дня + списание соседских бонусов (mock). Админка — этап 4.
