import { NextResponse } from 'next/server';
import { upiPayload } from '@/server/payments';

export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get('code') ?? '';
    return NextResponse.json(await upiPayload(code));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'UPI unavailable' }, { status: 400 });
  }
}
