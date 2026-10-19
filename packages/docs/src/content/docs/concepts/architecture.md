---
title: Architecture
description: How the Paywright service is structured, and the guarantees it makes.
---

## CQRS

Controllers are thin. Every operation is a command or a query, handled in its
own domain module (`commands/` and `queries/` inside `customers`, `plans`,
`payments`, `subscriptions`, `invoices` and `webhooks`).

## One chokepoint for Stripe

Every Stripe SDK call goes through a single `StripeService`. Handlers and
processors never touch the Stripe SDK directly, so they all get the same
resilience policy:

| Layer | Behaviour |
|---|---|
| Timeout | 10 seconds per attempt |
| Circuit breaker | Opens after 5 consecutive transient failures, half-opens after 10 seconds |
| Retry | Up to 3 attempts with exponential backoff |

Only infrastructure failures are retried or count toward the breaker:
connection errors, Stripe 5xx responses, rate limits and timeouts. Card
declines and validation errors are final and pass straight through.

While the breaker is open the service fails fast with `503`. A timed-out call
returns `504`. The Stripe SDK's own retries are turned off, so retries never
multiply across two layers.

## Webhook pipeline

Webhooks are verified, deduplicated, queued and processed in the background.
See [Webhooks](/guides/webhooks/#how-delivery-is-processed) for each step.

## Idempotency

- Webhook events are deduplicated by event ID with a race-free
  `ON CONFLICT DO NOTHING` insert, plus the BullMQ job ID.
- Payment and subscription creation accept an `idempotencyKey`, which is
  passed to Stripe. A retry with the same key returns the existing record
  instead of creating a second charge.

## PCI boundary

The service never handles card data. It returns a one-time `clientSecret`, and
the consuming app's frontend confirms the payment directly with Stripe. The
client secret is never stored.

## Money

All amounts are integers in the smallest currency unit (cents). Never floats.

## Schema migrations

TypeORM `synchronize` is off. Schema changes ship as migrations:

```bash
npm run migration:generate   # generate from entity changes
npm run migration:run        # apply pending migrations
npm run migration:revert     # roll back the last one
```

## Security

- **API key.** A global guard requires `x-api-key` on every route except
  health, metrics and the Stripe webhook. The comparison is constant-time.
- **Helmet** sets security headers.
- **Rate limiting** allows 100 requests per minute by default.
- **Input validation** rejects unknown fields in request bodies.
- **Env validation** stops the service from booting when misconfigured.
