'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import { buildDaySummary, closeDay } from '@/server/reports';

const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export async function generateSummaryAction(date: string) {
  await requireAdmin();
  if (!valid(date)) throw new Error('Invalid date');
  return buildDaySummary(date);
}

export async function closeDayAction(date: string) {
  await requireAdmin();
  if (!valid(date)) throw new Error('Invalid date');
  const summary = await closeDay(date);
  revalidatePath('/dashboard/reports');
  return summary;
}
