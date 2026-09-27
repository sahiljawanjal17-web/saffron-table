'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { monthlyRevenue } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-server';

const schema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  revenue: z.number().min(0).nullable(),
  expenses: z.number().min(0).nullable(),
  note: z.string().max(200).nullable()
});

export async function saveMonth(raw: z.input<typeof schema>) {
  await requireAdmin();
  const v = schema.parse(raw);
  await db
    .insert(monthlyRevenue)
    .values(v)
    .onConflictDoUpdate({ target: monthlyRevenue.month, set: { revenue: v.revenue, expenses: v.expenses, note: v.note } });
  revalidatePath('/dashboard/finance');
}

export async function deleteMonth(month: string) {
  await requireAdmin();
  await db.delete(monthlyRevenue).where(eq(monthlyRevenue.month, month));
  revalidatePath('/dashboard/finance');
}
