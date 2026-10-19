---
title: Quick start
description: Scaffold, configure and run a Paywright service locally.
---

## Prerequisites

- Node.js 22 or later
- Docker (for Postgres and Redis)
- A Stripe account with test-mode API keys
- The [Stripe CLI](https://docs.stripe.com/stripe-cli) for local webhooks

## 1. Scaffold the service

```bash
npx create-paywright-app my-payment-service
cd my-payment-service
```

The CLI copies `.env.example` to `.env` and installs dependencies unless you
opt out. See the [CLI reference](/reference/cli/) for its options.

## 2. Configure the environment

Edit `.env` and set at least `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and
`API_KEY`. The [configuration](/start/configuration/) page lists every variable.

## 3. Start the infrastructure and run

```bash
docker compose up -d postgres redis    # + pgadmin on :5050
npm run migration:run                  # creates all tables
npm run start:dev
```

Check that it's up:

```bash
curl http://localhost:3000/health
```

You should get `{"status":"ok",...}` with the database and Redis both `up`.
Swagger UI is served at http://localhost:3000/api/docs.

To run the service itself in Docker too, use `docker compose up`. The image is
a multi-stage production build.

## 4. Forward webhooks

In a second terminal:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Copy the printed `whsec_...` into `.env` as `STRIPE_WEBHOOK_SECRET` and
restart the service. See [Webhooks](/guides/webhooks/) for production setup.

## Next steps

- Take a [one-time payment](/guides/payments/)
- Set up a [subscription](/guides/subscriptions/)
- Call the service from TypeScript with the [SDK](/sdk/typescript/)
