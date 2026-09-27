'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { menuItems } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-server';
import { menuItemSchema } from './schema';

function refresh() {
  revalidatePath('/dashboard/menu');
  revalidatePath('/dashboard/stock');
  revalidatePath('/', 'layout');
}

export async function saveMenuItem(id: number | null, raw: z.input<typeof menuItemSchema>) {
  await requireAdmin();
  const v = menuItemSchema.parse(raw);
  const values = {
    ...v,
    description: v.description || null,
    imageUrl: v.imageUrl || null,
    price: v.kind === 'raw' ? 0 : v.price
  };
  if (id) await db.update(menuItems).set(values).where(eq(menuItems.id, id));
  else await db.insert(menuItems).values(values);
  refresh();
}

export async function deleteMenuItem(id: number) {
  await requireAdmin();
  // Soft delete keeps old orders and reports intact.
  await db.update(menuItems).set({ active: false }).where(eq(menuItems.id, id));
  refresh();
}
