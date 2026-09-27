'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-server';
import { updateSetting } from '@/lib/settings';
import { THEME_PRESETS, sanitizeBrandColor } from '@/lib/theme-presets';
import { ENGINE_MODELS } from '@/lib/ai/models';

const brandSchema = z.object({
  name: z.string().trim().min(1).max(60),
  tagline: z.string().trim().max(80),
  heroTitle: z.string().trim().max(120),
  heroSubtitle: z.string().trim().max(300),
  about: z.string().trim().max(800),
  phone: z.string().trim().max(30),
  email: z.string().trim().max(80),
  address: z.string().trim().max(200),
  hours: z.string().trim().max(120),
  instagram: z.string().trim().max(60)
});

const businessSchema = z.object({
  currency: z.string().trim().length(3),
  locale: z.string().trim().min(2).max(10),
  timezone: z.string().trim().min(3).max(60),
  taxPercent: z.number().min(0).max(40),
  lowStockThreshold: z.number().min(0),
  onlineOrdering: z.boolean(),
  reservations: z.boolean()
});

function refreshAll() {
  revalidatePath('/', 'layout');
}

export async function saveBrand(raw: z.input<typeof brandSchema>) {
  await requireAdmin();
  await updateSetting('brand', brandSchema.parse(raw));
  refreshAll();
}

export async function saveBusiness(raw: z.input<typeof businessSchema>) {
  await requireAdmin();
  const v = businessSchema.parse(raw);
  new Intl.DateTimeFormat(v.locale, { timeZone: v.timezone }); // throws on invalid tz/locale
  await updateSetting('business', { ...v, currency: v.currency.toUpperCase() });
  refreshAll();
}

export async function saveTheme(raw: { preset: string; primary: string | null; accent: string | null; radius: number }) {
  await requireAdmin();
  if (!THEME_PRESETS.some((t) => t.value === raw.preset)) throw new Error('Unknown preset');
  const primary = raw.primary ? sanitizeBrandColor(raw.primary) : null;
  const accent = raw.accent ? sanitizeBrandColor(raw.accent) : null;
  await updateSetting('theme', {
    preset: raw.preset,
    primary: primary?.color ?? null,
    accent: accent?.color ?? null,
    radius: Math.min(Math.max(raw.radius, 0), 1.25)
  });
  refreshAll();
  return { adjusted: Boolean(primary?.adjusted || accent?.adjusted) };
}

const paymentsSchema = z.object({
  cash: z.boolean(),
  cardOnDelivery: z.boolean(),
  payOnCollection: z.boolean(),
  upiQr: z.boolean(),
  upiId: z
    .string()
    .trim()
    .max(60)
    .refine((v) => v === '' || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v), 'UPI ID looks invalid (example: name@okaxis)'),
  upiPayeeName: z.string().trim().max(60),
  razorpay: z.boolean(),
  stripe: z.boolean(),
  holdMinutes: z.number().int().min(5).max(240)
});

export async function savePayments(raw: z.input<typeof paymentsSchema>) {
  await requireAdmin();
  const v = paymentsSchema.parse(raw);
  if (v.upiQr && !v.upiId) throw new Error('Enter your UPI ID to enable UPI QR');
  await updateSetting('payments', v);
  revalidatePath('/', 'layout');
}

export async function saveAi(raw: { budgetInr: number; defaultModel: string }) {
  await requireAdmin();
  if (!(raw.budgetInr >= 0)) throw new Error('Invalid budget');
  if (raw.defaultModel !== 'auto' && !ENGINE_MODELS.some((m) => m.key === raw.defaultModel)) {
    throw new Error('Unknown model');
  }
  await updateSetting('ai', raw);
  revalidatePath('/dashboard', 'layout');
}
