import crypto from 'node:crypto';
import { and, eq, inArray, lt } from 'drizzle-orm';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { db } from '@/db';
import { orderItems, orders } from '@/db/schema';
import { getAllSettings, getSetting } from '@/lib/settings';
import { setOrderStatus } from './orders';

import { ONLINE_METHODS, gatewayConfigured, paymentEnv as env } from '@/lib/payment-methods';


// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

async function orderByCode(code: string) {
  return db.query.orders.findFirst({ where: eq(orders.code, code) });
}

export async function markPaid(orderId: number, ref?: string | null) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.paymentStatus === 'paid') return order;
  if (order.status === 'cancelled') {
    // Paid after the hold expired — keep the money trail visible for a refund.
    await db.update(orders).set({ paymentStatus: 'paid', paymentRef: ref ?? order.paymentRef, paidAt: new Date().toISOString(), notes: `${order.notes ?? ''} [Paid after auto-cancel — refund or re-open]`.trim() }).where(eq(orders.id, orderId));
    return order;
  }
  await db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      paymentRef: ref ?? order.paymentRef,
      paidAt: new Date().toISOString(),
      status: order.status === 'pending' && order.source === 'online' ? 'preparing' : order.status
    })
    .where(eq(orders.id, orderId));
  return order;
}

export async function markFailed(orderId: number) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.paymentStatus === 'paid') return;
  await db.update(orders).set({ paymentStatus: 'failed' }).where(eq(orders.id, orderId));
  if (order.status !== 'cancelled') await setOrderStatus(orderId, 'cancelled');
}

/**
 * Online orders reserve stock immediately. If payment never completes, release the stock
 * after the hold window. Called lazily from menu / orders pages (no cron needed).
 */
export async function releaseStaleOnlinePayments() {
  const { holdMinutes } = await getSetting('payments');
  const cutoff = new Date(Date.now() - holdMinutes * 60_000).toISOString();
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.source, 'online'),
        inArray(orders.paymentMethod, ONLINE_METHODS),
        inArray(orders.paymentStatus, ['unpaid', 'awaiting']),
        eq(orders.status, 'pending'),
        lt(orders.createdAt, cutoff)
      )
    );
  for (const s of stale) await markFailed(s.id);
  return stale.length;
}

// ---------------------------------------------------------------------------
// Razorpay (official SDK + Checkout.js)
// ---------------------------------------------------------------------------

function razorpay() {
  if (!gatewayConfigured.razorpay()) throw new Error('Razorpay is not configured');
  return new Razorpay({ key_id: env.razorpayKeyId!, key_secret: env.razorpayKeySecret! });
}

export async function createRazorpayOrder(code: string) {
  const order = await orderByCode(code);
  if (!order) throw new Error('Order not found');
  if (order.paymentStatus === 'paid') throw new Error('Order is already paid');
  if (order.status === 'cancelled') throw new Error('Order was cancelled');
  const { brand, business } = await getAllSettings();
  const rzpOrder = await razorpay().orders.create({
    amount: Math.round(order.total * 100),
    currency: business.currency,
    receipt: order.code,
    notes: { orderCode: order.code }
  });
  await db.update(orders).set({ paymentStatus: 'awaiting', paymentRef: rzpOrder.id }).where(eq(orders.id, order.id));
  return {
    keyId: env.razorpayKeyId!,
    razorpayOrderId: rzpOrder.id,
    amount: Number(rzpOrder.amount),
    currency: business.currency,
    name: brand.name,
    description: `Order ${order.code}`,
    prefill: { name: order.customerName, contact: order.phone ?? '' }
  };
}

function safeCompare(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function verifyRazorpayPayment(input: {
  code: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const order = await orderByCode(input.code);
  if (!order || order.paymentRef !== input.razorpay_order_id) throw new Error('Payment does not match this order');
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret ?? '')
    .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
    .digest('hex');
  if (!safeCompare(expected, input.razorpay_signature)) throw new Error('Invalid payment signature');
  await markPaid(order.id, input.razorpay_order_id);
  return true;
}

export async function handleRazorpayWebhook(rawBody: string, signature: string | null) {
  if (!env.razorpayWebhookSecret) throw new Error('RAZORPAY_WEBHOOK_SECRET not set');
  const expected = crypto.createHmac('sha256', env.razorpayWebhookSecret).update(rawBody).digest('hex');
  if (!signature || !safeCompare(expected, signature)) throw new Error('Invalid webhook signature');
  const event = JSON.parse(rawBody);
  const entity = event?.payload?.payment?.entity ?? event?.payload?.order?.entity;
  const rzpOrderId: string | undefined = entity?.order_id ?? (entity?.entity === 'order' ? entity?.id : undefined);
  if (!rzpOrderId) return;
  const order = await db.query.orders.findFirst({ where: eq(orders.paymentRef, rzpOrderId) });
  if (!order) return;
  if (event.event === 'payment.captured' || event.event === 'order.paid') await markPaid(order.id, rzpOrderId);
  if (event.event === 'payment.failed' && order.paymentStatus !== 'paid') {
    await db.update(orders).set({ paymentStatus: 'failed' }).where(eq(orders.id, order.id));
  }
}

// ---------------------------------------------------------------------------
// Stripe (official SDK + hosted Checkout)
// ---------------------------------------------------------------------------

function stripe() {
  if (!gatewayConfigured.stripe()) throw new Error('Stripe is not configured');
  return new Stripe(env.stripeSecret!);
}

export async function createStripeSession(code: string, origin: string) {
  const order = await orderByCode(code);
  if (!order) throw new Error('Order not found');
  if (order.paymentStatus === 'paid') throw new Error('Order is already paid');
  if (order.status === 'cancelled') throw new Error('Order was cancelled');
  const { brand, business } = await getAllSettings();
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const currency = business.currency.toLowerCase();
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map((l) => ({
    quantity: l.qty,
    price_data: { currency, unit_amount: Math.round(l.price * 100), product_data: { name: l.name } }
  }));
  if (order.tax > 0) {
    line_items.push({ quantity: 1, price_data: { currency, unit_amount: Math.round(order.tax * 100), product_data: { name: 'Tax' } } });
  }
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items,
    client_reference_id: order.code,
    metadata: { orderCode: order.code },
    success_url: `${origin}/order/${order.code}?stripe_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/order/${order.code}?payment=cancelled`,
    custom_text: { submit: { message: `${brand.name} · Order ${order.code}` } }
  });
  await db.update(orders).set({ paymentStatus: 'awaiting', paymentRef: session.id }).where(eq(orders.id, order.id));
  return { url: session.url };
}

/** Called when the customer returns from Stripe — confirms directly with Stripe, never trusts the URL. */
export async function confirmStripeSession(code: string, sessionId: string) {
  if (!gatewayConfigured.stripe()) return false;
  const order = await orderByCode(code);
  if (!order || order.paymentRef !== sessionId) return false;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status === 'paid') {
    await markPaid(order.id, session.id);
    return true;
  }
  return false;
}

export async function handleStripeWebhook(rawBody: string, signature: string | null) {
  if (!env.stripeWebhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET not set');
  const event = stripe().webhooks.constructEvent(rawBody, signature ?? '', env.stripeWebhookSecret);
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    const code = session.metadata?.orderCode ?? session.client_reference_id;
    if (code && session.payment_status === 'paid') {
      const order = await orderByCode(code);
      if (order) await markPaid(order.id, session.id);
    }
  }
  if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const code = session.metadata?.orderCode ?? session.client_reference_id;
    const order = code ? await orderByCode(code) : null;
    if (order && order.paymentStatus !== 'paid') await markFailed(order.id);
  }
}

// ---------------------------------------------------------------------------
// UPI QR (no gateway — customer pays owner's VPA, staff confirms)
// ---------------------------------------------------------------------------

export async function upiPayload(code: string) {
  const order = await orderByCode(code);
  if (!order) throw new Error('Order not found');
  const p = await getSetting('payments');
  if (!p.upiQr || !p.upiId) throw new Error('UPI QR is not set up');
  const params = new URLSearchParams({
    pa: p.upiId,
    pn: p.upiPayeeName,
    am: order.total.toFixed(2),
    cu: 'INR',
    tn: `Order ${order.code}`,
    tr: order.code
  });
  const link = `upi://pay?${params.toString()}`;
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 320, color: { dark: '#17130f', light: '#ffffff' } });
  return { link, qr, upiId: p.upiId, payee: p.upiPayeeName, amount: order.total };
}

/** Customer taps "I have paid" — staff still verifies in the bank app before marking paid. */
export async function claimUpiPaid(code: string, utr: string) {
  const order = await orderByCode(code);
  if (!order || order.paymentMethod !== 'upi_qr' || order.paymentStatus === 'paid') throw new Error('Nothing to confirm');
  const clean = utr.replace(/\s/g, '').slice(0, 30);
  await db.update(orders).set({ paymentStatus: 'awaiting', paymentRef: clean || null }).where(eq(orders.id, order.id));
}
