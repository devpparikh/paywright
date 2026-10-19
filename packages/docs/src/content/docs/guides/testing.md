---
title: Testing payments
description: Exercise payment flows without a frontend, and run the service's tests.
---

## Confirm a payment without a frontend

After [creating a payment intent](/guides/payments/), confirm it with the
Stripe CLI:

```bash
stripe payment_intents confirm <pi_...> \
  --payment-method pm_card_visa \
  --return-url "https://example.com/done"
```

With `stripe listen` running, the resulting webhook updates the local payment.

## Test payment methods

| Payment method | Result |
|---|---|
| `pm_card_visa` | Succeeds |
| `pm_card_chargeDeclined` | Declines |

## Running the service's tests

```bash
npm test                 # unit tests
npm run build            # production build
```
