# Pages and routes

## Customer site (`src/app/(site)/`, shared layout with Header/Footer/Cart)

| Route | File | What it does |
|---|---|---|
| `/` | `page.tsx` | Home: hero (video), features, about, signature dishes gallery, reservation form |
| `/menu` | `menu/page.tsx` | Full live menu grouped by category, add-to-cart, respects today's stock |
| `/checkout` | `checkout/page.tsx` + `checkout-form.tsx` | Cart summary, customer details, payment method picker, places the order |
| `/order/[code]` | `order/[code]/page.tsx` | Order status tracker, pay-now panel if unpaid, bill download link |
| `/login` | `src/app/login/page.tsx` + `login-form.tsx` + `actions.ts` | Owner password login (not part of the site route group) |

Cart state lives client-side in `localStorage` (`src/features/site/cart/cart-context.tsx`),
not in the database, until checkout submits it as an order.

## Admin dashboard (`src/app/dashboard/`, gated by `src/proxy.ts` + each layout)

| Route | File | What it does |
|---|---|---|
| `/dashboard/overview` | `overview/page.tsx` | KPI cards, revenue chart, top dishes, order mix, recent orders/reservations |
| `/dashboard/orders` | `orders/page.tsx` + `features/orders/*` | Two tabs: **POS terminal** (place counter orders from live stock) and **Orders list** (status + payment management) |
| `/dashboard/stock` | `stock/page.tsx` + `features/stock/*` | Per-day stock table (dishes + raw inventory), add items, adjust quantities |
| `/dashboard/menu` | `menu/page.tsx` + `features/menu/*` | CRUD for dishes/raw items (form sheet + soft-delete) |
| `/dashboard/reservations` | `reservations/page.tsx` + `features/reservations/*` | 2-week reservation list grouped by day, assign table/status |
| `/dashboard/staff` | `staff/page.tsx` + `features/staff/*` | Staff CRUD, salary payment recording |
| `/dashboard/finance` | `finance/page.tsx` + `features/finance/*` | Monthly revenue (auto + manual), salaries, expenses, net |
| `/dashboard/reports` | `reports/page.tsx` + `features/reports/*` | On-demand / End-of-Day report generation, `.txt` download, closing history |
| `/dashboard/insights` | `insights/page.tsx` + `features/insights/*` | AI-generated weekly/monthly demand forecast + advice |
| `/dashboard/assistant` | `assistant/page.tsx` + `features/assistant/*` | Chat that can answer questions **and** change site settings/theme/prices |
| `/dashboard/settings` | `settings/page.tsx` + `features/settings/*` | Brand, theme, business rules, payments, AI budget/model, AI usage log |

Each admin page's mutations live in that feature's `actions.ts` (all start with
`await requireAdmin()`), calling into `src/server/*.ts` for the actual logic. Pages
themselves are async Server Components that fetch data directly with Drizzle — there is
no separate "admin API" layer for reads, only for actions/mutations and for anything the
public site needs (see below).

## API routes (`src/app/api/`)

### Public (no auth)
| Route | Purpose |
|---|---|
| `GET /api/menu` | Today's live menu (JSON), used by client components that need to refetch |
| `POST /api/orders` | Place an order (counter if an admin session cookie is present, else online) |
| `GET /api/orders/[code]/bill` | Plain-text bill download |
| `POST /api/reservations` | Create a table booking (+ optional pre-order) |
| `GET /api/payments/methods?type=` | Which payment methods are currently offered for an order type |
| `POST /api/payments/razorpay/order` | Create a Razorpay order for an existing site order |
| `POST /api/payments/razorpay/verify` | Verify the Razorpay Checkout.js callback signature |
| `POST /api/payments/razorpay/webhook` | Razorpay server-to-server webhook (HMAC-verified) |
| `POST /api/payments/stripe/session` | Create a Stripe Checkout Session |
| `POST /api/payments/stripe/webhook` | Stripe webhook (`stripe.webhooks.constructEvent`) |
| `GET /api/payments/upi?code=` | UPI deep link + QR code image (data URL) for an order |
| `POST /api/payments/upi/claim` | Customer claims "I have paid" with an optional UTR reference |

### Admin-only (`/api/admin/*`, gated by `src/proxy.ts` matcher + `requireAdmin()`)
| Route | Purpose |
|---|---|
| `POST /api/admin/ai/assistant` | AI Assistant chat + website-changing actions |
| `GET /api/admin/reports/eod?date=` | Download the End-of-Day report as `.txt` |

## Auth gate

`src/proxy.ts` (Next.js middleware) intercepts `/dashboard/*` and `/api/admin/*`,
checks the signed session cookie, and redirects to `/login` (page) or returns 401
(API) if missing/invalid. **Server actions are not covered by middleware** — every
`actions.ts` file must call `requireAdmin()` itself (from `src/lib/auth-server.ts`) as
its first line. If you add a new admin mutation, don't forget this call.
