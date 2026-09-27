import { NextResponse } from 'next/server';
import { handleRazorpayWebhook } from '@/server/payments';

// Razorpay dashboard -> Webhooks -> {APP_URL}/api/payments/razorpay/webhook
// Events: payment.captured, payment.failed, order.paid
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await handleRazorpayWebhook(raw, req.headers.get('x-razorpay-signature'));
    return NextResponse.json({ received: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Webhook error' }, { status: 400 });
  }
}
