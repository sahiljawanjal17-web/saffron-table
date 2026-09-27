# Payments

All logic lives in `src/server/payments.ts` (gateway calls, webhooks, hold/release)
and `src/lib/payment-methods.ts` (which methods are currently offered, env key
presence checks, shared labels/constants). Settings shape:
`PaymentSettings` in `src/lib/settings.ts`, edited from `/dashboard/settings`.

## Methods implemented

| Method | Value | Where it's offered | Requires |
|---|---|---|---|
| Pay at counter/table | `pay_on_collection` | Site checkout: pick-up & dine-in | Nothing |
| Cash on delivery | `cash` | Site checkout: delivery | Nothing |
| Card/UPI on delivery | `card_on_delivery` | Site checkout: delivery | Nothing |
| UPI QR (owner's own VPA) | `upi_qr` | Site checkout: any type, once enabled | Owner's UPI ID set in Settings |
| Razorpay (UPI/cards/netbanking/wallets) | `razorpay` | Site checkout: any type | `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` env vars |
| Stripe (intl cards, Apple/Google Pay) | `stripe` | Site checkout: any type | `STRIPE_SECRET_KEY` env var |
| Cash / UPI / Card / UPI QR / pay later | `cash`/`upi`/`card`/`upi_qr`/`pay_on_collection` | POS terminal (counter, admin only) | Nothing — counter sales are trusted |

A method only appears at checkout when **both** its Settings toggle is on **and**
(for Razorpay/Stripe) its env keys are present — see `customerMethods()` and
`gatewayConfigured` in `src/lib/payment-methods.ts`. This is why, out of the box with
no keys configured, the customer checkout only shows "Pay at pick-up".

## Order payment lifecycle

`orders.paymentStatus`: `unpaid → awaiting → paid`, or `→ failed` / `→ refunded`.
- Counter sales in `cash`/`upi`/`card` are marked `paid` immediately (`placeOrder()`).
- Online orders start `unpaid`; gateway flows move them to `awaiting` then `paid`
  (`markPaid()`), or `failed` (`markFailed()`, which also cancels the order and
  releases its stock via `setOrderStatus(id, 'cancelled')`).
- **Stock hold:** an online order reserves stock the instant it's placed (same
  transaction as any order). If payment never completes within
  `payments.holdMinutes` (default 30), `releaseStaleOnlinePayments()` — called lazily
  from the home page, `/menu`, and `/dashboard/orders` on every load, no cron needed —
  auto-cancels it and returns the stock. This is intentional: no background worker,
  the check just rides along on normal page loads.

## Security points already handled

- Razorpay: `verifyRazorpayPayment()` recomputes the HMAC-SHA256 of
  `order_id|payment_id` with the secret key and does a constant-time compare before
  trusting the client-side Checkout.js callback. The webhook handler independently
  verifies `x-razorpay-signature` the same way.
- Stripe: the client never reports success directly — `confirmStripeSession()` calls
  `stripe.checkout.sessions.retrieve()` to check `payment_status === 'paid'` itself.
  The webhook uses `stripe.webhooks.constructEvent()` (throws on bad signature).
- UPI QR has **no server-side proof of payment** (there's no gateway) — the customer's
  "I have paid" only sets `paymentStatus: 'awaiting'` with their claimed UTR; a human
  must still verify in the bank app and click **Mark paid** in
  `/dashboard/orders` (`PaymentCell` component). This is by design, not a bug.
- All gateway secrets are read only from `process.env` in `payment-methods.ts` /
  `payments.ts` — never stored in the `settings` table, never sent to the client.

## What is NOT done yet / needs the human owner

1. **No real Razorpay or Stripe keys have ever been used.** Everything above was
   verified with unit-style tests using a fake key + hand-computed signatures (see
   `PLAN.md`'s payments section for the exact test list) — the actual `orders.create`
   / `checkout.sessions.create` network calls have **never been exercised against the
   real APIs**. Before relying on this in production:
   - Get **test-mode** keys (`rzp_test_...` / `sk_test_...`) from each dashboard.
   - Put them in `.env.local` (see `env.example.txt` for exact variable names and
     where to find each one, plus the webhook URLs and event names to subscribe to).
   - Place one real test order through each gateway end-to-end (checkout → webhook →
     order marked paid) before switching to live keys.
2. **UPI QR is switched off by default** (`upiQr: false`, `upiId: ''` in
   `DEFAULT_SETTINGS`) — a placeholder UPI ID was deliberately *not* set, because
   shipping a fake VPA could send a customer's real money nowhere/to the wrong place.
   The restaurant owner must enter their **own** UPI ID in
   `/dashboard/settings` → Payments before turning this on.
3. **Refunds are not implemented.** `paymentStatus: 'refunded'` exists in the schema
   and is set manually (e.g. by editing the DB or extending the admin UI), but there
   is no Razorpay/Stripe refund API call wired up yet. If a client needs this, add it
   to `src/server/payments.ts` following the existing `markPaid`/`markFailed` pattern.
4. **No partial payments / split bills.** Each order is paid in full, once.
