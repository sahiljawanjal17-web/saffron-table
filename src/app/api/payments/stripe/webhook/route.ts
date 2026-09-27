import { NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/server/payments';

// Stripe dashboard -> Webhooks -> {APP_URL}/api/payments/stripe/webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
//         checkout.session.async_payment_failed, checkout.session.expired
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await handleStripeWebhook(raw, req.headers.get('stripe-signature'));
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Webhook error' }, { status: 400 });
  }
}
