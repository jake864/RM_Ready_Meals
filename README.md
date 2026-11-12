# RM — Ready Meals

Standalone Next.js 16 / React 19 / TypeScript / Tailwind 4 / Supabase MVP. Dark charcoal, warm white and lime storefront for fresh Tuesday meals in Geelong. Prices, photography, ingredients, and nutrition are illustrative and require approval.

## Run

```sh
npm ci
cp .env.example .env.local
npm run dev
```

The storefront and `/admin` → **Explore sample kitchen** work without credentials. Sample orders are fictional, remain in browser memory, and never enter production tables. Accounts and admin persistence require the new Supabase project. Checkout is disabled by default and rejects live Stripe keys even when enabled.

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

See [deployment and operational setup](docs/SETUP.md), [implementation and verification report](docs/DELIVERY.md), and [Lightspeed research](docs/LIGHTSPEED.md).

## Architecture

- `app/`: storefront, optional customer accounts, server-verified confirmation and admin pages; API handlers for checkout, signed webhooks, own orders, admin changes and browser print requests.
- `components/`: functional pack builder, guest checkout review and kitchen/admin workspace.
- `lib/`: catalog fallback, Melbourne weekly date handling, auth, pricing summary, disabled printer interface and fictional sample records.
- `supabase/migrations/`: standalone schema, 14 RLS-protected tables, service-only transactional order/payment functions, verified-email account linking, delivery timestamps.
- `tests/`: DOM interaction tests, real Postgres execution in PGlite with Supabase roles simulated, Stripe signature tests and time-zone tests.

## Payment behavior

The server prices packs from Postgres. A batch row lock serializes capacity reservations; both batch capacity and individual recipe caps apply. Inventory is reserved before creating Stripe Checkout, with a stable order key and Stripe idempotency key. A signed test-mode payment webhook checks amount, AUD currency, and Checkout Session against the pending order inside a transaction before confirmation. Duplicate events and duplicate success notifications do not duplicate payments or meals. The success redirect only reads verified state. Confirmed orders feed production and packing lists.

Pending reservations remain held until a verified Stripe expiry event releases them. If a crash occurs between creating a reservation and attaching its Stripe Session, an operator must reconcile it against Stripe before release; elapsed time alone is not proof of nonpayment. See the runbook.

## Access model

No admin bootstrap route, default password or shared admin secret. Create a verified Supabase Auth user and add their UUID to `admin_users` using the SQL editor. Every admin API request calls Supabase `getUser` and checks that table. Customer requests are constrained to the verified user's UUID. Publishable credentials can read active menu data; they cannot create or confirm orders, promote administrators, alter prices, read other customers, or print through the server. Server secret keys are never sent to browser code. Bearer authentication avoids cookie-based cross-site request authorization.
