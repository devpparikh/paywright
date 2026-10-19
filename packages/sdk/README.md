# @paywright/sdk

Typed TypeScript/JavaScript client for the **Paywright** payment service — a standalone, Stripe-backed payment microservice. Generated from the service's OpenAPI spec with [OpenAPI Generator](https://openapi-generator.tech/) (`typescript-axios`), so every endpoint and request body is fully typed.

> The SDK is a thin, typed wrapper over the service's REST API. It contains **no Stripe logic** — it calls **your** deployed Paywright service, which owns Stripe, the database, and webhooks. One published SDK works against any deployment; you supply the URL and key at runtime.

## Installation

```bash
npm install @paywright/sdk
```

`axios` is installed automatically as a dependency.

## Quick start

```ts
import { Configuration, CustomersApi } from '@paywright/sdk';

const config = new Configuration({
  basePath: process.env.PAYWRIGHT_URL,   // your deployment, e.g. https://payments.acme.internal
  apiKey: process.env.PAYWRIGHT_API_KEY, // sent automatically as the x-api-key header
});

const customers = new CustomersApi(config);

const { data: customer } = await customers.customersCreate({
  createCustomerDto: { email: 'jane@acme.com', name: 'Jane Doe' },
});
```

### Authentication

Set `apiKey` in `Configuration` and the SDK attaches it as the `x-api-key` header on every protected request. The public routes (`/health`, `/metrics`, `/webhooks/stripe`) are unsecured and send no key.

`apiKey` also accepts a function, for keys resolved at call time:

```ts
const config = new Configuration({
  basePath: process.env.PAYWRIGHT_URL,
  apiKey: () => loadKeyFromVault(),
});
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `basePath` | `string` | Base URL of your Paywright deployment (no trailing slash) |
| `apiKey` | `string \| (name: string) => string` | Your service API key; sent as the `x-api-key` header |

A single instance can be shared across all API classes:

```ts
import {
  Configuration,
  CustomersApi, PlansApi, PaymentsApi, SubscriptionsApi, InvoicesApi,
} from '@paywright/sdk';

const config = new Configuration({
  basePath: process.env.PAYWRIGHT_URL,
  apiKey: process.env.PAYWRIGHT_API_KEY,
});

const customers     = new CustomersApi(config);
const plans         = new PlansApi(config);
const payments      = new PaymentsApi(config);
const subscriptions = new SubscriptionsApi(config);
const invoices      = new InvoicesApi(config);
```

> Each method takes a **single request-parameter object** (path params + body together) and returns an axios response — read the body from `.data`.

## Usage by resource

### Customers

```ts
await customers.customersCreate({
  createCustomerDto: { email: 'jane@acme.com', name: 'Jane', phone: '+15551234567' },
});

await customers.customersList({ page: 1, limit: 20 });           // paginated
await customers.customersGet({ id });
await customers.customersUpdate({ id, updateCustomerDto: { name: 'Jane D.' } });
await customers.customersRemove({ id });
```

### Plans

```ts
await plans.plansCreate({
  createPlanDto: { name: 'Pro', amount: 2000, currency: 'usd', interval: 'month' },
});

await plans.plansList();
await plans.plansGet({ id });
await plans.plansArchive({ id });   // prices are immutable in Stripe — archive, don't delete
```

> Amounts are in the smallest currency unit — `2000` = $20.00.

### Payments

```ts
const { data: intent } = await payments.paymentsCreate({
  createPaymentDto: {
    customerId,
    amount: 4999,
    currency: 'usd',
    idempotencyKey: 'order-1234', // optional, prevents double-charges on retry
  },
});

await payments.paymentsList();
await payments.paymentsGet({ id });
await payments.paymentsRefund({ id }); // refund a succeeded payment
await payments.paymentsCancel({ id }); // cancel an uncaptured payment
```

### Subscriptions

```ts
await subscriptions.subscriptionsCreate({
  createSubscriptionDto: { customerId, planId, trialPeriodDays: 14 },
});

await subscriptions.subscriptionsList();
await subscriptions.subscriptionsGet({ id });
await subscriptions.subscriptionsCancel({ id }); // cancels immediately
```

### Invoices

```ts
await invoices.invoicesList();
await invoices.invoicesGet({ id });
```

## Error handling

Non-2xx responses reject with an `AxiosError`. Inspect `response.status` and `response.data`:

```ts
import { AxiosError } from 'axios';

try {
  await customers.customersGet({ id: 'does-not-exist' });
} catch (err) {
  if (err instanceof AxiosError) {
    console.error('Paywright error', err.response?.status, err.response?.data);
    // 401 → bad/missing x-api-key   404 → not found   429 → rate limited
  }
  throw err;
}
```

## Full API reference

Complete, auto-generated reference for every method and model:

| Resource | Reference |
|---|---|
| Customers | [CustomersApi](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/CustomersApi.md) |
| Plans | [PlansApi](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/PlansApi.md) |
| Payments | [PaymentsApi](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/PaymentsApi.md) |
| Subscriptions | [SubscriptionsApi](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/SubscriptionsApi.md) |
| Invoices | [InvoicesApi](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/InvoicesApi.md) |

Request models: [CreateCustomerDto](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/CreateCustomerDto.md) · [CreatePaymentDto](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/CreatePaymentDto.md) · [CreatePlanDto](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/CreatePlanDto.md) · [CreateSubscriptionDto](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/CreateSubscriptionDto.md) · [UpdateCustomerDto](https://github.com/devpparikh/paywright/blob/main/packages/sdk/docs/UpdateCustomerDto.md)

The `docs/` folder is regenerated from the OpenAPI spec on every build, so it always matches the live API.

## Type safety

Both requests **and** responses are fully typed. `customersCreate({ createCustomerDto })` checks the body, and `res.data` comes back as the real shape — `Customer`, `CustomerList`, `CreatePaymentResult`, `Array<Plan>`, and so on — no casting required:

```ts
const { data: customer } = await customers.customersGet({ id });
customer.stripeCustomerId; // ✅ typed as string

const { data: page } = await customers.customersList({ page: 1, limit: 20 });
page.total;                // ✅ typed as number
page.data[0].email;        // ✅ typed as string
```

## Regenerating

This package is generated — do not hand-edit the `*.ts` files. After the service API changes:

```bash
cd packages/template && npm run openapi:generate && cd ../..
openapi-generator-cli generate
```

`README.md` and `package.json` are preserved across regeneration via `.openapi-generator-ignore`.

## License

MIT © Dev Parikh
