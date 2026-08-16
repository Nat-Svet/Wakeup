# API — этап 3: оплата и списание бонусов

## Что готово
- Модель `Payment` (pending / paid / failed / cancelled)
- `POST /api/v1/checkout` — создать платёж за день (`deliveryId`, `bonusToSpend`, `idempotencyKey`)
- `POST /api/v1/payments/:id/confirm` — демо-подтверждение (mock-провайдер)
- `GET /api/v1/payments` — история (`?deliveryId=` опционально)
- `GET /api/v1/payments/:id`
- При confirm списываются бонусы (`order_spend`), выдаётся `receiptCode`

## Правила
- Пустой заказ → 422
- Детские позиции с qty 0 → 422
- День уже `paid` → 409
- Тот же `idempotencyKey` → тот же платёж (reuse)
- `bonusToSpend` ≤ баланс и ≤ сумме позиций

## UI
- Кнопка **Оплатить день** в карточке заказа на «Моя неделя»
- Модалка: сумма, слайдер бонусов, к оплате картой, демо-оплата
- После оплаты — бейдж «Оплачено» + чек, баланс в шапке обновляется

## Быстрая проверка
```bash
# login → TOKEN, взять DELIVERY_ID за день

curl -X POST http://localhost:3000/api/v1/checkout ^
  -H "Authorization: Bearer <TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"deliveryId\":\"<ID>\",\"bonusToSpend\":50,\"idempotencyKey\":\"demo-key-001\"}"

curl -X POST http://localhost:3000/api/v1/payments/<PAYMENT_ID>/confirm ^
  -H "Authorization: Bearer <TOKEN>"
```

Демо: `anna@prosyvaisya.local` / `demo12345`  
Провайдер: **mock** (без реальной карты). На прод позже — YooKassa/Stripe webhook вместо `/confirm`.
