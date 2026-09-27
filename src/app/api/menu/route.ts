import { NextResponse } from 'next/server';
import { getLiveMenu } from '@/server/stock';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { date, items } = await getLiveMenu();
  return NextResponse.json({ date, items });
}
