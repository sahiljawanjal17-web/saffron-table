# Architecture

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16, App Router, Turbopack | Server Components by default; `'use client'` only where needed |
| Language | TypeScript, strict | |
| Styling | Tailwind CSS v4 + shadcn/ui | Theme tokens are CSS custom properties, generated per-request (see below) |
| DB | Drizzle ORM + `@libsql/client` | Local file `data/app.db` in dev; Turso (hosted libSQL) in production |
| Forms | TanStack Form (`useAppForm`) | Field components in `src/components/forms/fields/*` |
| Tables | TanStack Table (starter's `DataTable`) or plain `<Table>` for simpler admin lists | |
| Charts | Recharts, wrapped in `src/components/ui/chart.tsx` | |
| Animation | `motion` (site pages only) | |
| Auth | `jose` (signed JWT in an httpOnly cookie) | No external auth provider, no multi-user |
| Payments | `razorpay`, `stripe`, `qrcode` npm packages (official SDKs) | |
| AI | Plain `fetch` to OpenRouter — no AI SDK framework | `src/lib/ai/client.ts` |

## Folder map

```
src/
  app/
    (site)/            customer-facing pages (route group, has its own layout)
      page.tsx          home
      menu/             live menu + order online
      checkout/         cart -> place order -> payment
      order/[code]/     order tracking + pay-now + bill download
      layout.tsx        Header/Footer/CartProvider wrap for the whole site
    dashboard/          admin pages, one folder per section (see 03-PAGES-AND-ROUTES.md)
      layout.tsx        sidebar + header + auth gate (redirects to /login)
    login/              owner login page + server action
    api/                route handlers (public + /api/admin/* + /api/payments/*)
  features/             one folder per admin/site feature area
    <feature>/
      actions.ts         'use server' mutations (calls requireAdmin(), then src/server/*)
      schema.ts           zod schemas shared by the form and the action
      components/         client components (forms, tables, panels) for that feature
  server/               framework-agnostic business logic, callable from actions or routes
    stock.ts             daily stock: ensureDay, getStockForDate, add/adjust/remove
    orders.ts             placeOrder (the stock-safe transaction), reservations
    payments.ts            Razorpay/Stripe/UPI glue, markPaid/markFailed, stale-order release
    reports.ts             End-of-day summary + plain-text formatting
    analytics.ts            dashboards: daily series, top items, monthly finance
    forecast.ts              statistical demand forecast (no AI — pure math)
    ai-assistant.ts           AI assistant: builds context, calls model, applies actions
    ai-insights.ts             AI insights: forecast + AI explanation, saved to DB
    bill.ts                    plain-text customer bill
  lib/                  small stateless helpers usable from client or server
    settings.ts           typed get/update for the `settings` table (brand/theme/business/ai/payments)
    theme-presets.ts       colour palettes + the "no neon" sanitizer + CSS generator
    payment-methods.ts     which payment methods are available, env key presence checks
    money.ts, time.ts      currency/locale-aware formatting, timezone-aware dates
    auth.ts, auth-server.ts  session cookie creation/verification
    ai/models.ts, ai/client.ts  engine model registry + the OpenRouter caller
  db/
    schema.ts            Drizzle table definitions (see 02-DATABASE.md)
    index.ts              DB client singleton
  components/            shared UI: shadcn primitives (ui/), layout chrome, icons, forms
  generated/models.json  AUTO-GENERATED — do not hand-edit, see 05-AI-INTEGRATION.md
scripts/
  sync_models.py         reads data_science/engine/model_config.py -> writes generated/models.json
  seed.ts                 demo data generator (deterministic PRNG, see 00-START-HERE rule 7)
public/media/            dish photos (Unsplash), hero video (Mixkit) — all free-licence
```

## Request flow examples

**Customer places an order (`/checkout` → `POST /api/orders`):**
1. Client `CheckoutForm` posts `{ customerName, phone, type, paymentMethod, items }`.
2. `src/app/api/orders/route.ts` decides `source: 'counter' | 'online'` (counter only if
   an admin session cookie is present) and calls `placeOrder()`.
3. `src/server/orders.ts#placeOrder`: validates with zod, checks the payment method is
   currently allowed (`customerMethods()` from `payment-methods.ts`), then opens a DB
   transaction that does one atomic `UPDATE daily_stock SET sold_qty = sold_qty + n
   WHERE ... remaining >= n` per line item. Any line with 0 rows updated throws
   `OrderError` and the whole transaction rolls back — this is what prevents overselling.
4. Order + order_items are inserted; `paymentStatus` starts `unpaid` unless it's a
   counter cash/UPI/card sale (marked `paid` immediately).
5. Response includes the order `code`; the client redirects to `/order/[code]`, or, for
   Razorpay/Stripe, opens the payment flow first (`04-PAYMENTS.md`).

**Admin changes the website via AI Assistant:**
1. `/dashboard/assistant` client component posts chat history + chosen model to
   `POST /api/admin/ai/assistant`.
2. `src/server/ai-assistant.ts#runAssistant` builds a context block (current settings,
   today's stock, today's sales, top dishes), sends it + a system prompt to
   `src/lib/ai/client.ts#chat()` (which resolves the model, retries, falls back to the
   engine's backup model, enforces the ₹ budget for paid models, and logs usage).
3. The model's reply is expected to be one JSON object `{ reply, actions: [...] }`.
   Each action is validated against a `zod` discriminated union
   (`actionSchema` in `ai-assistant.ts`) **before** anything is applied — an
   unrecognised or malformed action is rejected, not executed.
4. Colour-changing actions go through `sanitizeBrandColor()` (`theme-presets.ts`),
   which desaturates/darkens anything that would look neon/cyberpunk.

## Theming mechanism (important, easy to break)

Colours are **not** static Tailwind classes. `src/lib/theme-presets.ts` defines 4
palettes as base colours; `buildThemeCss()` expands each into the full shadcn token set
(`--background`, `--primary`, `--sidebar`, etc.) for light and dark mode, and the root
layout (`src/app/layout.tsx`) injects the result as an inline `<style>` tag, reading the
current theme from the `settings` table on every request. This is what lets the AI
assistant or the Settings page change the whole site's look instantly, and it's why
theming logic should stay server-side and data-driven — do not add hardcoded colour
classes to new components; use the existing `bg-primary`, `text-foreground`, etc. tokens.
