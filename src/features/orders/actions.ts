'use server';

import { revalidatePath } from 'next/cache';
import { ORDER_STATUSES } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-server';
import { setOrderStatus } from '@/server/orders';
import { markPaid } from '@/server/payments';

export async function updateOrderStatus(id: number, status: (typeof ORDER_STATUSES)[number]) {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) throw new Error('Invalid status');
  await setOrderStatus(id, status);
  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard/stock');
  revalidatePath('/dashboard/overview');
}

export async function markOrderPaid(id: number) {
  await requireAdmin();
  await markPaid(id, null);
  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard/reports');
}
