import { NextResponse } from 'next/server';
import { createStripeSession } from '@/server/payments';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.json(await createStripeSession(String(code), origin));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start payment' }, { status: 400 });
  }
}
