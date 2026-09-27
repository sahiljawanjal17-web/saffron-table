'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-server';
import { generateInsight } from '@/server/ai-insights';

export async function generateInsightAction(period: 'weekly' | 'monthly', model: string) {
  await requireAdmin();
  try {
    const r = await generateInsight(period, model);
    revalidatePath('/dashboard/insights');
    return { ok: true as const, model: r.model, usedBackup: r.usedBackup, costInr: r.costInr };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : 'Failed to generate insights' };
  }
}
