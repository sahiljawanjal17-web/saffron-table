# Saffron Table — Restaurant & Cloud-Kitchen OS

Premium restaurant website + complete back-office, white-label (brand, colours and copy are editable
from Settings or by asking the AI assistant).

**Customer site:** homepage with ambient video, signature dishes, live menu with real stock, cart,
checkout, order tracking + downloadable bill, table booking with pre-order.

**Admin (`/dashboard`):** Overview · Orders & POS · Reservations · Daily Stock (permanent items,
real-time deduction) · Menu · Staff & salaries · Finance (auto + manual months) · Reports
(End of Day, .txt download, closing history) · AI Insights (weekly/monthly forecast) · AI Assistant
(changes the website from text commands) · Settings.

## Run locally

```bash
npm install
npm run db:push        # create tables in data/app.db
npm run dev            # http://localhost:3000   (admin: /login)
```

Optional demo data (menu, staff, 90 days of orders): `npm run db:seed` — wipe & reseed with `npm run db:seed -- --reset`.
For a real restaurant, skip the seed and add the menu from **Dashboard → Menu**.

## Configuration (`.env.local`)

| Variable | Needed | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | production | Owner login password (dev default `admin123`) |
| `AUTH_SECRET` | production | Long random string for signing sessions |
| `OPENROUTER_API_KEY` | for AI | If not set, read from `ENGINE_DIR/.env` |
| `ENGINE_DIR` | optional | Path to `data_science/engine` (default `~/OneDrive/data_science/engine`) |
| `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | production | `libsql://…turso.io` + token. Default local `file:data/app.db` |
| `NEXT_PUBLIC_APP_URL` | production | Public URL (SEO, OpenRouter referer, Stripe return URL) |
| `RAZORPAY_*`, `STRIPE_*` | optional | Online payments — see Payments below |

## Payments

| Method | Where | Needs |
|---|---|---|
| Pay at counter / table | Pick-up & dine-in | nothing |
| Cash on delivery, Card/UPI on delivery | Delivery | nothing |
| UPI QR (direct to your UPI ID) | Online, staff verifies | your UPI ID in Settings → Payments |
| Razorpay — UPI, cards, netbanking, wallets | Online | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (+ webhook secret) |
| Stripe — international cards, Apple Pay, Google Pay | Online | `STRIPE_SECRET_KEY` (+ webhook secret) |
| Cash / UPI / Card / UPI QR / pay later | POS counter | nothing |

- Every order tracks `unpaid → awaiting → paid` (or `failed` / `refunded`); Orders page has **Mark paid**.
- Online orders reserve stock immediately; if payment is not completed within the hold time
  (default 30 min, Settings → Payments) the order is auto-cancelled and stock is returned.
- Razorpay payments are verified by HMAC signature; Stripe returns are confirmed with the Stripe API; both have webhooks.
- End of Day report shows collected vs outstanding and totals per method.
- Always test with `rzp_test_` / `sk_test_` keys before going live.

## AI models

All models come from `data_science/engine/model_config.py`. `npm run sync:models` (runs automatically
before `dev`/`build`) writes `src/generated/models.json`; commit that file so servers without the
engine folder still work. Every AI screen has a model selector (Auto / free / paid).
Engine rules are kept: 2 attempts → backup model, ₹ budget cap for paid models, usage log in Settings.
Forecast numbers are computed statistically in code (with backtest accuracy); the model explains them.

## Deploy (Vercel + Turso)

1. Create a Turso database, set `DATABASE_URL` + `DATABASE_AUTH_TOKEN`, run `npm run db:push` once.
2. Import the repo on Vercel, add the env vars above, deploy.

Any Node host works too: `npm run build && npm start` (or `BUILD_STANDALONE=true` for Docker).

## Credits (all MIT)

- Admin shell, UI components, forms, charts, AI chat UI — [Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
- Site header, hero, features, about, gallery, footer — [GetNextjsTemplates/chef-kitchen](https://github.com/GetNextjsTemplates/chef-kitchen-nextjs-landing-page-template)
- Reservation section/form, menu grid, animation variants — [arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend](https://github.com/arnobt78/Restaurant-Landing-Page-1--NextJS-Frontend)
- Payments — official [razorpay](https://github.com/razorpay/razorpay-node) & [stripe](https://github.com/stripe/stripe-node) SDKs, [qrcode](https://github.com/soldair/node-qrcode) (MIT)
- POS terminal — [JoaoHenriqueBarbosa/FinOpenPOS](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS)
- Photos: Unsplash · Video: Mixkit (free licences)

See `PLAN.md` for architecture, progress and the full reuse log.

**For a new AI or developer picking this up with no context:** start at [`docs/00-START-HERE.md`](docs/00-START-HERE.md) — a self-contained guide to the architecture, database, every page/route, payments status, AI integration, coding conventions, and setup/deploy steps.
