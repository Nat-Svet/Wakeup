# API — этап 2: трекер и логистика

## Что готово
- `GET|PATCH /api/v1/deliveries/:id/tracking`
- `POST /api/v1/deliveries/:id/tracking/advance` — следующий статус
- `POST /api/v1/deliveries/:id/tracking/reset` — демо: снова «Замешиваем»
- `GET /api/v1/deliveries/:id/tracking/stream` — SSE (токен в `Authorization` или `?token=`)
- При статусе `at_door` один раз начисляется **+50** (`neighbor_share`)

## UI
- Автологин демо-пользователя (`AuthContext`) при живой БД
- Неделя гидратируется из API; правки состава/слота/флагов пишутся обратно
- Вкладка **Трекер** показывает тот же заказ (метка «live» после синка)
- Баланс бонусов синхронизируется в шапку
- Если API недоступен — прежний локальный демо-таймер

## Быстрая проверка
```bash
# health
curl http://localhost:3000/api/health

# login → token
curl -X POST http://localhost:3000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"anna@prosyvaisya.local\",\"password\":\"demo12345\"}"

# deliveries (сегодня)
curl http://localhost:3000/api/v1/deliveries?from=2026-08-14&to=2026-08-14 ^
  -H "Authorization: Bearer <TOKEN>"

# advance
curl -X POST http://localhost:3000/api/v1/deliveries/<ID>/tracking/advance ^
  -H "Authorization: Bearer <TOKEN>"
```

Демо: `anna@prosyvaisya.local` / `demo12345`
