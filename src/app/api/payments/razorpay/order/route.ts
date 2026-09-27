import { NextResponse } from 'next/server';
import { createRazorpayOrder } from '@/server/payments';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    return NextResponse.json(await createRazorpayOrder(String(code)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start payment' }, { status: 400 });
  }
}
