import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyRazorpayPayment } from '@/server/payments';

const schema = z.object({
  code: z.string().min(3),
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(10)
});

export async function POST(req: Request) {
  try {
    await verifyRazorpayPayment(schema.parse(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Verification failed' }, { status: 400 });
  }
}
