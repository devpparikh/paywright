---
title: Operations
description: Health checks, metrics, logs and API docs for running Paywright in production.
---

| Endpoint | Purpose |
|---|---|
| `GET /health` | Database and Redis readiness. Returns `503` if either is down |
| `GET /metrics` | Prometheus counters, including webhook events processed or failed and payments succeeded or failed |
| `GET /api/docs` | Swagger UI |

:::caution
`/metrics` doesn't require the API key. Restrict it at the network level in
production.
:::

## Logs

Logs are structured JSON from Pino. Set `LOG_LEVEL` to control verbosity. In
`development` they're pretty-printed on a single line.

## Common commands

```bash
npm run build            # production build
npm start                # run the build
npm run migration:run    # apply pending migrations
npm test                 # unit tests
```

## Docker

`docker compose up` runs the service, Postgres, Redis and pgAdmin together.
The service image is a multi-stage production build.
