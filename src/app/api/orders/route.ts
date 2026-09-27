import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { OrderError, placeOrder } from '@/server/orders';
import { isAdmin } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Counter orders only from a signed-in owner; everyone else is an online order.
    const source = body?.source === 'counter' && (await isAdmin()) ? 'counter' : 'online';
    if (source === 'online') body.type = body.type === 'dine_in' || body.type === 'delivery' ? body.type : 'takeaway';
    const order = await placeOrder(body, source);
    return NextResponse.json({ id: order.id, code: order.code, total: order.total }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid order' }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Could not place order' }, { status: 500 });
  }
}
