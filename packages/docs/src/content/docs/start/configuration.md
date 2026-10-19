---
title: Configuration
description: Environment variables the Paywright service reads at boot.
---

All configuration comes from environment variables, validated at boot. The
service **refuses to start** if a required variable is missing or malformed,
so a misconfiguration fails at deploy time rather than when the first webhook
arrives.

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key, `sk_test_...` or `sk_live_...` (from the [dashboard](https://dashboard.stripe.com/test/apikeys)) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret, `whsec_...` (see [Webhooks](/guides/webhooks/)) |
| `API_KEY` | Yes | Key your apps send as `x-api-key`. Minimum 16 characters |
| `DATABASE_URL` | Yes | Postgres connection string (`postgres://` or `postgresql://`) |
| `REDIS_URL` | Yes | Redis connection string (`redis://`) |
| `PORT` | No | HTTP port. Default `3000` |
| `LOG_LEVEL` | No | `fatal`, `error`, `warn`, `info`, `debug` or `trace`. Default `info` |
| `NODE_ENV` | No | `development`, `production` or `test`. Default `development` |
| `POSTGRES_HOST_PORT` | No | Host port for the Docker Compose Postgres. Set it (e.g. `5433`) if 5432 is taken |

Generate a strong API key with:

```bash
openssl rand -hex 32
```

## Example `.env`

```bash
PORT=3000
API_KEY=change-me-to-a-long-random-key

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# localhost URLs for running the app on your host;
# docker-compose.yml overrides these for the app container
DATABASE_URL=postgres://postgres:postgres@localhost:5432/stripe_payments
REDIS_URL=redis://localhost:6379

LOG_LEVEL=info
NODE_ENV=development
```
