# Setup, running, and deployment

## First-time setup

```bash
cd saffron-table
npm install
cp env.example.txt .env.local     # then fill in values, see table below
npm run db:push                    # creates all tables in data/app.db (or your DATABASE_URL)
npm run dev                        # http://localhost:3000
```

`npm run dev` and `npm run build` both auto-run `npm run sync:models` first
(`predev`/`prebuild` hooks) — this regenerates `src/generated/models.json` from the
external engine config if that folder is present. See `05-AI-INTEGRATION.md`.

## Environment variables (`env.example.txt` is the canonical list with comments)

| Variable | Required? | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | Production | Owner login password. Dev falls back to `admin123` if unset. |
| `AUTH_SECRET` | Production | Random string used to sign the session JWT. Dev falls back to an insecure hardcoded string — **must** be set before deploying. |
| `OPENROUTER_API_KEY` | For AI features | If unset, read from `ENGINE_DIR/.env` instead. |
| `ENGINE_DIR` | Optional | Path to the sibling `data_science/engine` folder. Default: `~/OneDrive/data_science/engine`. |
| `DATABASE_URL` | Production | `libsql://<db>.turso.io`. Default (unset) = local file `file:data/app.db`. |
| `DATABASE_AUTH_TOKEN` | Production (with Turso) | Turso auth token. |
| `NEXT_PUBLIC_APP_URL` | Production | Public site URL — used for SEO metadata, the OpenRouter `HTTP-Referer` header, and Stripe's redirect URLs. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional | Enables Razorpay at checkout once also toggled on in Settings. |
| `RAZORPAY_WEBHOOK_SECRET` | Optional | Verifies the Razorpay webhook signature. |
| `STRIPE_SECRET_KEY` | Optional | Enables Stripe at checkout once also toggled on in Settings. |
| `STRIPE_WEBHOOK_SECRET` | Optional | Verifies the Stripe webhook signature. |
| `BUILD_STANDALONE` | Optional | Set `true` for a Docker/VPS standalone build output. |

See `04-PAYMENTS.md` for what's still untested with real payment gateway keys.

## Demo data vs. a real client's data

`npm run db:seed` fills the DB with ~20 dishes, 8 raw items, 7 staff, and 90 days of
realistic order history (deterministic, same result every run) — **this is
intentional**, kept so the site looks complete for demos and so charts/AI forecasts
have something to show. Add `-- --reset` to wipe every table first before reseeding.

**For a real paying client's own deployment**, don't ship them the seeded demo data:
1. Point `DATABASE_URL` at a fresh database (new Turso DB, or delete `data/app.db`
   locally).
2. `npm run db:push` to create empty tables.
3. **Do not run `db:seed`.**
4. Log in and add their real menu from `/dashboard/menu`, their brand details from
   `/dashboard/settings`, and their staff from `/dashboard/staff`.

## Building and running in production

```bash
npm run build     # runs typecheck + sync:models + next build
npm start         # serves the build on port 3000 (or $PORT)
```

`npm run typecheck` (`tsc --noEmit`) is worth running on its own before a build if
you're iterating quickly — it's faster feedback than a full build.

## Deploying (Vercel + Turso is the tested path)

1. Create a Turso database: `turso db create <name>`, then `turso db tokens create
   <name>` for `DATABASE_AUTH_TOKEN`.
2. `DATABASE_URL=<turso-url> DATABASE_AUTH_TOKEN=<token> npm run db:push` once, from
   your local machine, to create the schema on the remote DB.
3. Import the repo into Vercel, set every env var from the table above in the Vercel
   project settings, deploy.
4. If using Razorpay/Stripe, register the webhook URLs
   (`https://<domain>/api/payments/razorpay/webhook`,
   `https://<domain>/api/payments/stripe/webhook`) in each provider's dashboard with
   the events listed in `env.example.txt`.

Any other Node host works too (`npm run build && npm start`), or Docker with
`BUILD_STANDALONE=true` set at build time (produces a `.next/standalone` output).

## Common pitfalls

- **Forgetting `AUTH_SECRET`/`ADMIN_PASSWORD` in production** — `src/lib/auth.ts`
  throws at runtime if `NODE_ENV === 'production'` and either is unset, rather than
  silently falling back to the insecure dev defaults. This is intentional; don't
  remove the check.
- **Editing `src/generated/models.json` by hand** — it gets overwritten on the next
  `npm run dev`/`build` if the engine folder is present. Edit
  `data_science/engine/model_config.py` instead, or the sync script if the source
  format itself needs to change.
- **Writing to `daily_stock.sold_qty` outside `placeOrder()`'s transaction** — breaks
  the oversell guard. Use `adjustStock()`/`setOpeningQty()` (`src/server/stock.ts`)
  for any manual stock correction instead.
