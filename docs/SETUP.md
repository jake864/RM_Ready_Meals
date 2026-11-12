# Deployment and operations

## External access still needed

1. **GitHub:** the connected account is `jake864`, but repository creation returned `Resource not accessible by integration (createRepository)`. Create a new **private** repository named `RM_Ready_Meals`, authorize this integration for that repository, and push this source. Do not select WodFlow or FarmDog Ops.
2. **Supabase:** the user approved `jake864's Org` and Sydney. Project creation was attempted, but its native confirmation returned `Project creation was declined`. Creation is stopped; complete/approve that native confirmation before retrying. Create a new project named `RM — Ready Meals`, preferably Sydney (`ap-southeast-2`). Review any quoted costs before creation; no project has been created and no existing database was changed.
3. **Vercel:** install/connect the Vercel integration or authenticate the Vercel CLI. Import the new GitHub repository as a **new** Vercel project with framework **Next.js** and Node 24. Deploy a branch preview. No Vercel project or deployment was created in this session.

## New Supabase project

Run `supabase/migrations/20261112071332_initial_rm_schema.sql` and then `docs/seed-batches.sql` in the **new RM project's** SQL editor. The migration was generated with Supabase CLI v2.81.3 and has been executed successfully in embedded Postgres; it has not been verified against a hosted Supabase project.

Alternatively install/pin CLI v2.81.3, inspect `supabase link --help` / `supabase db push --help`, link only the new RM project, and push the tracked migration. CLI v3 changed hosted-target flags, so do not assume v2 commands apply to v3.

Verify tables and functions, run Supabase Security and Performance Advisors, and generate TypeScript database types for the hosted instance. The public schema must show RLS enabled on all 14 RM tables. Secret/service role access must remain server-only.

Create an Auth account through `/account`, verify its email, then add the intended administrator manually:

```sql
-- Replace this UUID with the verified intended administrator's Auth UUID.
insert into public.admin_users(user_id) values ('YOUR-VERIFIED-USER-UUID');
```

Enable email confirmations. Configure the Supabase Site URL and allowed redirects for the Vercel preview and later production domain. Configure custom SMTP and test confirmation delivery before customer use. Guest orders attach to accounts only when the account's email is verified.

The batch seed creates the next 90 days of Tuesdays. Manage future Tuesdays in **Admin → Calendar**. Default cutoff is Sunday **8:00 pm Australia/Melbourne**; pickup is Tuesday **5:00 pm** at CrossFit Ocean Grove. These are implementation defaults, editable per batch, and require operational approval. Meal caps can be set separately per recipe; empty means no recipe cap.

## Vercel environment variables

Set these in the **new RM project's preview environment**, using Vercel's secure environment settings. Never paste secrets into chat or commit `.env.local`.

| Variable                               | Value                                                         |
| -------------------------------------- | ------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | URL for the new RM project                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That project's publishable key                                |
| `SUPABASE_SECRET_KEY`                  | That project's server secret key; never `NEXT_PUBLIC_`        |
| `STRIPE_SECRET_KEY`                    | RM Stripe sandbox `sk_test_…`                                 |
| `STRIPE_WEBHOOK_SECRET`                | Signing secret for this preview's webhook                     |
| `APP_URL`                              | Exact stable HTTPS preview URL, without trailing slash        |
| `CHECKOUT_ENABLED`                     | `false` initially; `true` only for configured sandbox testing |
| `LIGHTSPEED_PRINTING_ENABLED`          | `false`                                                       |

Public Supabase variables are compiled into the frontend: redeploy after changing them. Configure Vercel Deployment Protection for private preview. Stripe cannot reach a protected webhook without an appropriate Vercel protection exception/bypass configured securely; make only the webhook reachable as required. Do not place a protection bypass secret in source or ordinary URLs.

## Stripe sandbox setup and acceptance test

Use the current API matching pinned stripe-node v23.1.0 (`2026-10-28.endive`). The current Checkout API uses `allowed_payment_method_types: ['card']`. Do not change keys to live mode: the code deliberately rejects live payments.

Register `/api/webhooks/stripe` for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

Enable Stripe receipt emails as appropriate. The app requests a payment receipt at the checkout email and shows an order confirmation screen after webhook verification. Stripe test mode does not guarantee email delivery; no separate transactional order-email provider has been configured.

Once connected, complete these checks on the real preview:

1. Build a mixed 3RM pack. Pay with Stripe test card `4242 4242 4242 4242`, any future expiry and valid test CVC. Confirm the order appears only after the signed paid webhook.
2. Replay the webhook. Verify one payment, one order and unchanged meal counts.
3. Test a declined card; no confirmed order or production quantity should appear.
4. Expire an unpaid Checkout Session and deliver its expiry webhook; verify capacity becomes available. A canceled browser redirect alone does not release inventory.
5. Confirm unverified, anonymous and non-admin users cannot access `/api/admin`; only the intended verified administrator can edit settings.
6. Verify a customer sees only their own orders, including a guest order after verified-email account creation.
7. Set batch capacity and a recipe cap, suspend orders, and adjust cutoff/pickup. Verify the storefront and server enforce the saved settings. Exercise Sunday cutoff in both daylight saving and standard time.
8. Print a production sheet and a customer packing docket on the actual kitchen browser/printer. Confirm legibility and page breaks. Browser print dialogs cannot prove a physical print succeeded.

## Reservation recovery

Never release pending inventory only because a timer elapsed: a paid webhook may be delayed. Re-deliver failed webhooks through Stripe's dashboard. For an orphan pending order, inspect its `stripe_session_id`, Stripe metadata `order_id`, and client reference. If the Session exists, re-deliver its paid/expired webhook or retry the original checkout attempt to repair Session attachment. If no Session is attached, verify in the Stripe dashboard that no matching Session/payment exists before an authorized operator changes its status to `expired`. Automatic orphan reconciliation is not included in this MVP.

## Printing

Use **Overview** or **Kitchen** for the Tuesday production sheet, and **Dockets** for all or one customer's packing list. Server requests are deduplicated by document key. Tick **Explicit reprint** for a deliberate new attempt after checking the prior physical result. Print history records `browser_dialog_opened`, not physical success. Browser jobs never send Rune POS orders. Lightspeed submission intentionally remains unimplemented until the API, mappings and approved test process are available.

## Before operating publicly

Approve prices, final recipes, allergens, verified nutrition, pickup address/window and Sunday cutoff. Replace representative photography with actual meals. Complete hosted database advisor checks, browser/mobile/print testing and real Stripe sandbox acceptance. Configure transactional order emails if required beyond the confirmation screen/payment receipt, an operational contact, and the appropriate customer policies. Live-payment support requires a later explicitly approved code/configuration change; changing an environment variable alone cannot enable it.
