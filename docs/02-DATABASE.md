# Database

Drizzle ORM over libSQL (SQLite-compatible). Schema source of truth:
`src/db/schema.ts`. Client: `src/db/index.ts` (`db`, plus `schema` re-export).

- Dev: local file `data/app.db` (`DATABASE_URL=file:data/app.db`, the default).
- Prod: Turso — set `DATABASE_URL=libsql://<db>.turso.io` + `DATABASE_AUTH_TOKEN`.
- Push schema changes: `npm run db:push` (wraps `drizzle-kit push`).
- Seed demo data: `npm run db:seed` (add `-- --reset` to wipe first). Deterministic —
  same output every run. See `07-SETUP-AND-DEPLOY.md` for fresh-client setup.

## Tables

### `settings`
Key/value store, one row per settings group. `key` is one of `brand`, `theme`,
`business`, `ai`, `payments`; `value` is JSON matching the corresponding type in
`src/lib/settings.ts`. Always read/write through `getSetting()` / `updateSetting()` —
never query this table directly — because those functions merge with
`DEFAULT_SETTINGS` so a missing key never crashes the app.

### `staff` / `salary_payments`
Simple staff roster. Every field except `name` and `role` is optional by design (the
owner may not have phone/email/salary data for everyone). `salary_payments` is an
append-only ledger — one row per payment made, linked by `staffId`.

### `monthly_revenue`
Manual override for months *before* the system was in use, or to record `expenses`
alongside system-tracked revenue. `src/server/analytics.ts#monthlyFinance()` prefers
real order data for a month when any exists, and falls back to this table only when
the system has zero orders for that month — see the `source: 'orders' | 'manual' |
'none'` field it returns.

### `menu_items`
Both **sellable dishes** (`kind: 'dish'`) and **raw inventory** (`kind: 'raw'`, e.g.
"Onions", tracked in kg but never sold directly) live in this one table, distinguished
by `kind`. Key flags:
- `isPermanent` — auto-added to every day's stock with `defaultDailyQty` (see
  `ensureDay()` in `src/server/stock.ts`). Non-permanent items must be added to a
  specific day manually (daily specials).
- `isSignature` — shown in the homepage's "signature dishes" gallery.
- `active` — soft-delete flag. Deleting a menu item (`deleteMenuItem` action) sets
  `active: false` rather than removing the row, so historical orders/reports referring
  to it stay intact.

### `daily_stock`
The stock ledger, one row per `(date, menu_item_id)` — unique constraint enforced.
```
remaining = opening_qty + adjust_qty - sold_qty
```
- `opening_qty` — set when the item is added to the day (auto for permanent items).
- `sold_qty` — incremented **only** by the atomic order-placement transaction
  (`placeOrder()` in `src/server/orders.ts`); never write to this directly.
- `adjust_qty` — manual +/- from the Daily Stock admin page (waste, restock, "mark
  sold out" from the AI assistant sets this to `-opening_qty` effectively).

**This is the most safety-critical table.** The oversell guard is a single SQL
statement in `placeOrder()`:
```sql
UPDATE daily_stock
SET sold_qty = sold_qty + :qty
WHERE date = :date AND menu_item_id = :id
  AND opening_qty + adjust_qty - sold_qty >= :qty
```
If this updates 0 rows, the code throws and the whole order transaction rolls back —
this is what makes concurrent orders safe without locking. **Do not** replace this with
a read-check-then-write pattern.

### `orders` / `order_items`
One order = one row in `orders` + N rows in `order_items` (a frozen snapshot of
name/price/qty at order time — menu price changes later don't affect past orders).

Key `orders` columns:
- `code` — human-facing ID (`OR-XXXXXX`), unique, used in URLs (`/order/[code]`) and
  as the Razorpay/Stripe reference.
- `type`: `dine_in | takeaway | delivery | online` — `online` is currently unused as a
  *type* (it's really a `source`); kept for schema flexibility.
- `source`: `counter` (placed by staff via POS) | `online` (placed by a customer).
- `status`: `pending → preparing → ready → completed`, or `cancelled` at any point.
  Cancelling via `setOrderStatus()` **returns the sold quantity to that day's stock**.
- `businessDate` — the restaurant's local calendar date the order belongs to (not the
  UTC date), computed via `src/lib/time.ts#dateInTz()`. Used for daily reports/stock.
- `paymentMethod`, `paymentStatus`, `paymentRef`, `paidAt` — see `04-PAYMENTS.md`.

### `reservations` / `reservation_items`
Table bookings with an optional pre-order (same item-snapshot pattern as orders).
`dining_tables` is a simple label+capacity list an admin can assign a reservation to.

### `ai_usage`
One row per AI API call (success or failure), used for the ₹ budget check
(`aiSpendInr()` sums this table) and the Settings page's usage log. Never delete rows
from here without also understanding the budget will effectively reset.

### `ai_insights`
One row per generated forecast+explanation (`generateInsight()` in
`src/server/ai-insights.ts`). `forecast` and `content` are stored as JSON strings.

### `day_closings`
One row per date an admin explicitly "closed" from the Reports page — a frozen copy of
the `buildDaySummary()` output at close time, kept for history even if later orders for
that date are edited.

## Type exports

`src/db/schema.ts` exports `MenuItem`, `Staff`, `Order`, `OrderItem`, `Reservation`,
`DailyStock` (via `$inferSelect`) plus the const-array enums (`ORDER_TYPES`,
`ORDER_STATUSES`, `PAYMENT_STATUSES`, `PAYMENT_METHODS`, `RESERVATION_STATUSES`) — use
these instead of retyping the string unions.
