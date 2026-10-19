---
title: One-time payments
description: Create a customer, create a payment intent, and confirm it on the frontend.
---

## 1. Create a customer

Do this once per user, then store the returned `id` on your side.

```bash
curl -X POST http://localhost:3000/api/v1/customers \
  -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
  -d '{"email":"user@example.com","name":"Jane Doe"}'
```

## 2. Create a payment intent

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
  -d '{"customerId":"<uuid>","amount":4900,"currency":"usd"}'
```

Amounts are integers in the smallest currency unit, so `4900` is $49.00.

The response contains the local `payment` record and a `clientSecret`. The
client secret is a one-time credential and is never persisted.

## 3. Confirm on the frontend

Pass the `clientSecret` to your frontend and confirm the payment with
Stripe.js (`stripe.confirmPayment`). Card data goes straight to Stripe and
never touches your servers.

When Stripe finishes, it sends a `payment_intent.succeeded` webhook and the
local payment status updates to `succeeded` automatically.

## Retrying safely

Pass an `idempotencyKey` in the create body when retrying a request that timed
out. The same key always returns the same payment, never a double charge:

```json
{ "customerId": "<uuid>", "amount": 4900, "currency": "usd", "idempotencyKey": "order-1234" }
```

## Cancel and refund

| Action | Endpoint | When |
|---|---|---|
| Cancel | `POST /api/v1/payments/:id/cancel` | The payment hasn't been captured yet |
| Refund | `POST /api/v1/payments/:id/refund` | The payment has succeeded |

A refunded payment stays `refunded` locally even if a late
`payment_intent.*` webhook arrives afterwards.
