---
title: Introduction
description: What Paywright is and how it fits into your stack.
---

Paywright is a standalone HTTP microservice that owns your entire Stripe
integration: customers, plans, one-time payments, subscriptions, invoices and
webhook processing. Your applications, in any language and on any stack, call
its REST API and store only foreign IDs (such as the customer and
subscription IDs) on their side.

You don't install Paywright as a library. You scaffold it with
`create-paywright-app`, own the generated code, and deploy it like any other
service.

## What you get

| Concern | Implementation |
|---|---|
| Framework | NestJS 11 + TypeScript, CQRS (CommandBus / QueryBus) |
| Database | PostgreSQL via TypeORM, migration-based schema |
| Webhook queue | BullMQ + Redis: verify, dedup, enqueue, process in background |
| Resilience | cockatiel circuit breaker + retry + timeout around every Stripe call |
| Idempotency | `ON CONFLICT DO NOTHING` event dedup, Stripe idempotency keys on writes |
| Security | API-key guard (timing-safe), Helmet, rate limiting, env validation at boot |
| Observability | Pino structured logs, Prometheus `/metrics`, Terminus `/health` |
| API docs | Swagger UI at `/api/docs` |
| Dev environment | Docker Compose: app + Postgres + Redis + pgAdmin |

## API surface

All routes live under `/api/v1` and require an `x-api-key` header:

| Domain | Endpoints |
|---|---|
| Customers | create, get, list, update, delete |
| Plans | create (Stripe product + price), get, list, archive |
| Payments | create intent, get, list, cancel, refund |
| Subscriptions | create (with optional trial), get, list, cancel |
| Invoices | get, list (read-only, synced from Stripe webhooks) |

Infrastructure routes need no API key: `GET /health`, `GET /metrics`, and
`POST /webhooks/stripe` (verified by Stripe signature instead).

See the [API reference](/api/) for every endpoint, parameter and schema.

## How a payment flows

The service never touches card data. Your frontend confirms payments directly
with Stripe using a one-time `clientSecret`:

```
Your backend   →  POST /api/v1/payments                →  Paywright  →  Stripe
Your backend   ←  { clientSecret }                     ←  Paywright
Your frontend  →  stripe.confirmPayment(clientSecret)  →  Stripe
Stripe         →  POST /webhooks/stripe (signed)       →  Paywright
                  verified → deduplicated → queued → status synced
```

Subscription renewals, payment failures and cancellations arrive the same way,
as webhooks that keep the local mirror in sync automatically.
