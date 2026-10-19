# create-paywright-app

[![npm: create-paywright-app](https://img.shields.io/npm/v/create-paywright-app?logo=npm&label=create-paywright-app)](https://www.npmjs.com/package/create-paywright-app)
[![npm: @paywright/sdk](https://img.shields.io/npm/v/@paywright/sdk?logo=npm&label=%40paywright%2Fsdk)](https://www.npmjs.com/package/@paywright/sdk)
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

## Quick start

```bash
npx create-paywright-app my-payment-service
cd my-payment-service
# edit .env — set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, API_KEY
docker compose up -d postgres redis
npm run migration:run
npm run start:dev
```

See the [template README](packages/template/README.md) for the full runbook:
environment variables, webhook setup with the Stripe CLI, payment flows, and
testing.

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
npm install                       # workspace root installs both packages

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
