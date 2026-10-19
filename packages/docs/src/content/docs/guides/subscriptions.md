---
title: Subscriptions
description: Create plans, subscribe customers, and gate access on subscription status.
---

## 1. Create a plan

A plan is a Stripe product plus a price.

```bash
curl -X POST http://localhost:3000/api/v1/plans \
  -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
  -d '{"name":"Pro Monthly","amount":1900,"currency":"usd","interval":"month"}'
```

Stripe prices are immutable. To retire a plan, archive it with
`POST /api/v1/plans/:id/archive` rather than deleting it. Archived plans can't
be used for new subscriptions.

## 2. Subscribe a customer

`trialPeriodDays` is optional.

```bash
curl -X POST http://localhost:3000/api/v1/subscriptions \
  -H "Content-Type: application/json" -H "x-api-key: $API_KEY" \
  -d '{"customerId":"<uuid>","planId":"<uuid>","trialPeriodDays":14}'
```

The subscription is created with its first invoice left unpaid. The response
includes that invoice's `clientSecret` for your frontend to confirm, the same
way as a [one-time payment](/guides/payments/#3-confirm-on-the-frontend).
It's `null` when a trial defers the first charge.

## 3. Keep status in sync

Renewals, payment failures and cancellations arrive as webhooks and update the
local subscription automatically. Paid and failed invoices are recorded too,
and you can read them from `/api/v1/invoices`.

To gate access in your app, read `GET /api/v1/subscriptions/:id` (for example
on login). Both `active` and `trialing` mean the customer is entitled.

## Cancelling

`DELETE /api/v1/subscriptions/:id` cancels the subscription immediately.
