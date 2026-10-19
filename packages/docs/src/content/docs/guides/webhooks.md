---
title: Webhooks
description: Point Stripe at your service so payment and subscription state stays in sync.
---

Stripe needs to reach the service at `POST /webhooks/stripe` to sync payment,
subscription and invoice state. The endpoint doesn't use the API key; it
verifies Stripe's signature on the raw request body instead.

## Local development

Use the [Stripe CLI](https://docs.stripe.com/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Copy the printed `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET` and restart
the service. Keep `stripe listen` running while you develop.

## Production

1. In the Stripe dashboard, open **Developers → Webhooks** and add an endpoint
   pointing at `https://your-host/webhooks/stripe`.
2. Subscribe it to `payment_intent.*`, `customer.subscription.*` and
   `invoice.*` events.
3. Set that endpoint's signing secret as `STRIPE_WEBHOOK_SECRET`.

## Handled events

| Events | Effect |
|---|---|
| `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` | Sync the local payment status |
| `customer.subscription.created`, `.updated`, `.deleted` | Sync subscription status, billing period and trial end |
| `invoice.paid`, `invoice.payment_failed`, `invoice.finalized` | Create or update the local invoice |

Any other event type is recorded and acknowledged with no further action.

## How delivery is processed

1. **Verify.** The signature is checked against the raw body. An invalid
   signature returns `400`.
2. **Deduplicate.** The event ID is inserted into `webhook_events` with
   `ON CONFLICT DO NOTHING`. Concurrent deliveries of the same event race on
   the insert and exactly one wins.
3. **Enqueue.** The event goes onto a BullMQ queue, with the event ID as the
   job ID as a second layer of dedup.
4. **Acknowledge.** The endpoint returns `200` right away, well inside Stripe's
   timeout.
5. **Process.** A background worker applies the change. A failed job is
   retried 5 times with exponential backoff. Jobs that exhaust their retries
   stay in Redis for inspection, and the `webhook_events` row keeps the last
   error.
