# create-paywright-app

[![CI](https://github.com/devpparikh/paywright/actions/workflows/ci.yml/badge.svg)](https://github.com/devpparikh/paywright/actions/workflows/ci.yml)
[![npm: create-paywright-app](https://img.shields.io/npm/v/create-paywright-app?logo=npm&label=create-paywright-app)](https://www.npmjs.com/package/create-paywright-app)
[![npm: @paywright/sdk](https://img.shields.io/npm/v/@paywright/sdk?logo=npm&label=%40paywright%2Fsdk)](https://www.npmjs.com/package/@paywright/sdk)
[![docs](https://img.shields.io/badge/docs-paywright.dev--parikh.com-informational)](https://docs.paywright.dev-parikh.com)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Scaffold a production-ready **Stripe payment microservice** in one command.

📖 **Documentation: [docs.paywright.dev-parikh.com](https://docs.paywright.dev-parikh.com)**

```bash
npx create-paywright-app my-payment-service
```

The generated service is a standalone HTTP microservice that owns the full
Stripe integration — customers, plans, one-time payments, subscriptions,
invoices, and webhook processing. Any application (any language, any stack)
integrates with it over a REST API and stores only foreign IDs
(`stripe_customer_id`, subscription IDs) on its side.

## Contents

- [What you get](#what-you-get)
- [Architecture](#architecture)
- [Setup guide](#setup-guide)
- [Configuration](#configuration)
- [How payment flows work](#how-payment-flows-work)
- [Client SDK](#client-sdk)
- [Testing](#testing)
- [CI/CD and releases](#cicd-and-releases)
- [Repository layout](#repository-layout)
- [Developing from source](#developing-from-source)

## What you get

| Concern | Implementation |
|---|---|
| Framework | NestJS 11 + TypeScript, CQRS (CommandBus / QueryBus) |
| Database | PostgreSQL via TypeORM, migration-based schema |
| Webhook queue | BullMQ + Redis — verify, dedup, enqueue, process in background |
| Resilience | cockatiel circuit breaker + retry + timeout around every Stripe call |
| Idempotency | `ON CONFLICT DO NOTHING` event dedup, Stripe idempotency keys on writes |
| Security | API-key guard (timing-safe), Helmet, rate limiting, env validation at boot |
| Observability | Pino structured logs, Prometheus `/metrics`, Terminus `/health` |
| API docs | Swagger UI at `/api/docs` |
| Dev environment | Docker Compose: app + Postgres + Redis + pgAdmin |

### API surface

All routes under `/api/v1`, guarded by an `x-api-key` header:

```
POST   /customers            GET /customers          GET /customers/:id
PATCH  /customers/:id        DELETE /customers/:id

POST   /plans                GET /plans              GET /plans/:id
POST   /plans/:id/archive

POST   /payments             GET /payments           GET /payments/:id
POST   /payments/:id/cancel  POST /payments/:id/refund

POST   /subscriptions        GET /subscriptions      GET /subscriptions/:id
DELETE /subscriptions/:id

GET    /invoices             GET /invoices/:id
```

Unguarded infrastructure routes: `GET /health`, `GET /metrics`,
`POST /webhooks/stripe` (Stripe signature-verified).

## Architecture

```
  Consuming app (any stack)                         Stripe
          │  REST + x-api-key                         ▲   │
          ▼                                           │   │ signed webhooks
  ┌───────────────────────────────────────────────┐   │   │
  │  Paywright service (NestJS)                   │   │   │
  │                                               │   │   │
  │  Controllers ──► CommandBus / QueryBus        │   │   │
  │                    │                          │   │   │
  │                    ▼                          │   │   │
  │  StripeService  (timeout → retry → breaker) ──┼───┘   │
  │                                               │       │
  │  POST /webhooks/stripe ◄──────────────────────┼───────┘
  │    verify → dedup → enqueue → 200             │
  │                       │                       │
  │                       ▼                       │
  │               BullMQ worker ── sync state     │
  └──────────┬───────────────────────┬────────────┘
             ▼                       ▼
        PostgreSQL                 Redis
   (customers, plans,         (webhook queue)
    payments, subscriptions,
    invoices, webhook_events)
```

**CQRS.** Controllers are thin. Every operation is a command or a query,
handled in its own domain module (`commands/` and `queries/` inside
`customers`, `plans`, `payments`, `subscriptions`, `invoices` and `webhooks`).

**One chokepoint for Stripe.** Every Stripe SDK call goes through a single
`StripeService`, so all handlers share one resilience policy:

| Layer | Behaviour |
|---|---|
| Timeout | 10 seconds per attempt |
| Circuit breaker | Opens after 5 consecutive transient failures, half-opens after 10 seconds |
| Retry | Up to 3 attempts with exponential backoff |

Only infrastructure failures (connection errors, Stripe 5xx, rate limits,
timeouts) are retried or count toward the breaker; card declines and
validation errors pass straight through. An open breaker fails fast with
`503`, a timed-out call returns `504`, and the Stripe SDK's own retries are
off so retries never multiply across two layers.

**Webhook pipeline.**

1. **Verify** the signature against the raw body (`400` if invalid).
2. **Deduplicate** by inserting the event ID into `webhook_events` with
   `ON CONFLICT DO NOTHING` — concurrent deliveries race and exactly one wins.
3. **Enqueue** onto BullMQ with the event ID as the job ID (second dedup layer).
4. **Acknowledge** with `200` immediately, well inside Stripe's timeout.
5. **Process** in a background worker; failed jobs retry 5 times with
   exponential backoff, and the `webhook_events` row keeps the last error.

**Idempotency.** Payment and subscription creation accept an
`idempotencyKey` that is passed to Stripe, so a retry returns the existing
record instead of charging twice.

**PCI boundary.** The service never handles card data. It returns a one-time
`clientSecret` that the consuming app's frontend confirms directly with
Stripe; the secret is never stored.

**Money.** All amounts are integers in the smallest currency unit (cents) —
never floats.

**Schema.** TypeORM `synchronize` is off; every schema change ships as a
migration.

**Security.** Global constant-time API-key guard (except health, metrics and
the webhook), Helmet headers, rate limiting (100 requests/minute by default),
request bodies with unknown fields rejected, and env validation that stops the
service from booting when misconfigured.

Full details: [Architecture](https://docs.paywright.dev-parikh.com/concepts/architecture/)
· [Webhooks](https://docs.paywright.dev-parikh.com/guides/webhooks/)
· [Operations](https://docs.paywright.dev-parikh.com/concepts/operations/)

## Setup guide

### Prerequisites

- Node.js 22+
- Docker + Docker Compose (Postgres and Redis)
- A Stripe account with test-mode keys
- [Stripe CLI](https://docs.stripe.com/stripe-cli) for forwarding webhooks locally

### 1. Scaffold the service

```bash
npx create-paywright-app my-payment-service
cd my-payment-service
```

Pass `--yes` to accept all defaults with no prompts, or `--skip-install` to
skip `npm install`. See the [CLI reference](https://docs.paywright.dev-parikh.com/reference/cli/).

### 2. Configure

Edit `.env` and set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and
`API_KEY` (see [Configuration](#configuration)). Generate a strong API key
with `openssl rand -hex 32`.

### 3. Start the infrastructure and run migrations

```bash
docker compose up -d postgres redis
npm run migration:run
```

### 4. Forward Stripe webhooks

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Copy the printed `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET`. Keep
`stripe listen` running while you develop.

### 5. Run the service

```bash
npm run start:dev
```

The API is at `http://localhost:3000/api/v1`, Swagger UI at
`http://localhost:3000/api/docs`, and readiness at `GET /health`.

To run everything in containers instead, `docker compose up` starts the
service, Postgres, Redis and pgAdmin together.

**Production:** add a webhook endpoint in the Stripe dashboard pointing at
`https://your-host/webhooks/stripe`. See the
[template README](packages/template/README.md) for the full runbook.

## Configuration

All configuration comes from environment variables, validated at boot. The
service refuses to start if a required variable is missing or malformed.

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key, `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret, `whsec_...` |
| `API_KEY` | Yes | Key your apps send as `x-api-key`. Minimum 16 characters |
| `DATABASE_URL` | Yes | Postgres connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `PORT` | No | HTTP port. Default `3000` |
| `LOG_LEVEL` | No | `fatal` … `trace`. Default `info` |
| `NODE_ENV` | No | `development`, `production` or `test`. Default `development` |
| `POSTGRES_HOST_PORT` | No | Host port for the Docker Compose Postgres, if 5432 is taken |

## How payment flows work

The service never touches card data (PCI compliance) — the consuming app's
frontend confirms payments directly with Stripe using a one-time
`clientSecret`:

```
Consuming app  →  POST /api/v1/payments      →  this service  →  Stripe
Consuming app  ←  { clientSecret }           ←  this service
Frontend       →  stripe.confirmPayment(clientSecret)  →  Stripe
Stripe         →  POST /webhooks/stripe (signed event) →  this service
                  → verified, deduplicated, queued, processed
                  → local payment status syncs to "succeeded"
```

Subscriptions work the same way: state changes (renewals, failures,
cancellations) arrive as webhooks and sync the local mirror automatically.

## Client SDK

TypeScript/JavaScript consumers don't have to hand-write HTTP calls — install
the generated client, **[`@paywright/sdk`](packages/sdk/README.md)**, for
typed methods over every endpoint:

```bash
npm i @paywright/sdk
```

```ts
import { Configuration, CustomersApi } from '@paywright/sdk';

const config = new Configuration({
  basePath: process.env.PAYWRIGHT_URL,    // your deployment
  apiKey: process.env.PAYWRIGHT_API_KEY,  // sent automatically as x-api-key
});

const { data } = await new CustomersApi(config).customersCreate({
  createCustomerDto: { email: 'jane@acme.com', name: 'Jane' },
});
```

The SDK is deployment-agnostic — one published package works against any
deployment; you supply the URL and key at runtime. Full usage in the
[SDK README](packages/sdk/README.md).

**Other languages:** the service exports its OpenAPI spec, so you can generate
a Python, Go, or any-language client the same way — see
[generating a client SDK](packages/template/README.md#generating-a-client-sdk).

## Testing

```bash
npm test --workspace packages/template
```

Unit tests (Jest) cover the parts where correctness matters most:

| Suite | What it checks |
|---|---|
| `stripe.service.spec.ts` | Transient failures are retried, card declines are not, and the circuit opens and fails fast |
| `webhooks.controller.spec.ts` | New events are verified, recorded and enqueued; duplicates skipped; invalid signatures rejected |
| `webhooks.processor.spec.ts` | Events marked processed, failures rethrown for BullMQ retry, unhandled types acknowledged |
| `create-payment.handler.spec.ts` | Idempotency key passed to Stripe; a retried key returns the existing row |
| `refund-payment.handler.spec.ts` | Refunding a succeeded payment; `404` on an unknown payment |

To exercise real payment flows without a frontend, confirm a payment intent
with the Stripe CLI (`stripe payment_intents confirm <pi_...> --payment-method pm_card_visa`).
See [Testing payments](https://docs.paywright.dev-parikh.com/guides/testing/).

## CI/CD and releases

| Workflow | Trigger | What it does |
|---|---|---|
| [CI](.github/workflows/ci.yml) | PRs and pushes to `main` | Type-checks the template, runs tests, builds the CLI, smoke-tests the scaffolder |
| [Publish to npm](.github/workflows/publish.yml) | Push to `main` | Publishes `create-paywright-app` when its version has no `v<version>` tag yet, then tags it |
| [Publish SDK to npm](.github/workflows/publish-sdk.yml) | Push to `main` | Same for `@paywright/sdk`, tagged `sdk-v<version>` |
| [Docs](.github/workflows/docs.yml) | Changes to docs or the OpenAPI spec | Builds the docs site; deploys to Cloudflare on `main` |

Bumping a package's `version` is the release action — tags are derived, never
hand-made. Publishing uses npm trusted publishing (OIDC) with provenance, so
no npm token is stored in the repo.

## Repository layout

```
packages/
├── cli/        the npx scaffolder (published to npm as create-paywright-app)
├── template/   the NestJS service that gets scaffolded
├── sdk/        typed TypeScript client generated from the service's OpenAPI
│               spec (published to npm as @paywright/sdk)
└── docs/       documentation site (Starlight), deployed to
                docs.paywright.dev-parikh.com
```

## Developing from source

```bash
git clone https://github.com/devpparikh/paywright.git
cd paywright
npm install                       # workspace root installs all packages

# run the service template directly
cd packages/template
cp .env.example .env              # add your Stripe test keys
docker compose up -d postgres redis
npm run migration:run
npm run start:dev
npm test                          # unit tests

# work on the CLI
cd packages/cli
npm run build && npm run sync-template
node dist/index.js test-app --yes --skip-install
```

`packages/cli/template/` is a build artifact regenerated from
`packages/template` on every `npm pack`/`publish` — never edit it directly.

## License

[MIT](LICENSE) © 2026 Dev Parikh
