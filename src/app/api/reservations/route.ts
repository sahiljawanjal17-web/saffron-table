import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { OrderError, createReservation } from '@/server/orders';

export async function POST(req: Request) {
  try {
    const reservation = await createReservation(await req.json());
    return NextResponse.json({ code: reservation.code }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? 'Invalid booking' }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Could not book' }, { status: 500 });
  }
}
