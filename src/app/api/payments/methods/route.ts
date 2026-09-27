import { NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';
import { customerMethods } from '@/lib/payment-methods';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get('type') ?? 'takeaway';
  return NextResponse.json({ methods: customerMethods(await getSetting('payments'), type) });
}
