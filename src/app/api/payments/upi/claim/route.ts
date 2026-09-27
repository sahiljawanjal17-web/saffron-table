import { NextResponse } from 'next/server';
import { claimUpiPaid } from '@/server/payments';

export async function POST(req: Request) {
  try {
    const { code, utr } = await req.json();
    await claimUpiPaid(String(code), String(utr ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not confirm' }, { status: 400 });
  }
}
