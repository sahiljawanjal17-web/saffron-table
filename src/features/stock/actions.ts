'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import { addItemsToDay, adjustStock, removeFromDay, setOpeningQty } from '@/server/stock';

function refresh() {
  revalidatePath('/dashboard/stock');
  revalidatePath('/dashboard/orders');
  revalidatePath('/', 'layout');
}

export async function addToDayAction(date: string, menuItemId: number, qty: number) {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(qty >= 0)) throw new Error('Invalid input');
  await addItemsToDay(date, [{ menuItemId, qty }]);
  refresh();
}

export async function setOpeningAction(stockId: number, qty: number) {
  await requireAdmin();
  if (!(qty >= 0)) throw new Error('Invalid quantity');
  await setOpeningQty(stockId, qty);
  refresh();
}

export async function adjustAction(stockId: number, delta: number) {
  await requireAdmin();
  if (!Number.isFinite(delta)) throw new Error('Invalid adjustment');
  await adjustStock(stockId, delta);
  refresh();
}

export async function removeFromDayAction(stockId: number) {
  await requireAdmin();
  await removeFromDay(stockId);
  refresh();
}
