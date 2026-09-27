'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { RESERVATION_STATUSES, reservations } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-server';

export async function updateReservation(
  id: number,
  patch: { status?: (typeof RESERVATION_STATUSES)[number]; tableId?: number | null }
) {
  await requireAdmin();
  if (patch.status && !RESERVATION_STATUSES.includes(patch.status)) throw new Error('Invalid status');
  await db.update(reservations).set(patch).where(eq(reservations.id, id));
  revalidatePath('/dashboard/reservations');
  revalidatePath('/dashboard/overview');
}
