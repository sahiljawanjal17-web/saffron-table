import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { DEFAULT_PRESET, type ThemeSettings } from '@/lib/theme-presets';
import modelsJson from '@/generated/models.json';

export type BrandSettings = {
  name: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  about: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
};

export type BusinessSettings = {
  currency: string;
  locale: string;
  timezone: string;
  taxPercent: number;
  lowStockThreshold: number;
  onlineOrdering: boolean;
  reservations: boolean;
};

export type AiSettings = {
  budgetInr: number;
  defaultModel: string; // 'auto' or a model key
};

/** Which payment options customers / staff can use. Gateway secrets live only in env vars. */
export type PaymentSettings = {
  cash: boolean;
  cardOnDelivery: boolean;
  payOnCollection: boolean;
  upiQr: boolean;
  upiId: string;
  upiPayeeName: string;
  razorpay: boolean;
  stripe: boolean;
  /** Minutes an unpaid online order holds stock before it is auto-cancelled. */
  holdMinutes: number;
};

export type SettingsMap = {
  brand: BrandSettings;
  theme: ThemeSettings;
  business: BusinessSettings;
  ai: AiSettings;
  payments: PaymentSettings;
};

export const DEFAULT_SETTINGS: SettingsMap = {
  brand: {
    name: 'Saffron Table',
    tagline: 'Modern Indian kitchen',
    heroTitle: 'Slow-cooked heritage, served with quiet luxury.',
    heroSubtitle:
      'Seasonal produce, hand-ground spices and recipes carried across three generations — cooked fresh every single day.',
    about:
      'Saffron Table began as a family kitchen with one tandoor and a notebook of recipes. Today our chefs still grind spices each morning, bake breads to order and plan the menu around what the market brings in.',
    phone: '+91 98765 43210',
    email: 'hello@saffrontable.com',
    address: '12 Heritage Lane, Bandra West, Mumbai 400050',
    hours: 'Daily · 12:00 – 15:30 · 19:00 – 23:30',
    instagram: 'saffrontable'
  },
  theme: { preset: DEFAULT_PRESET, primary: null, accent: null, radius: 0.625 },
  business: {
    currency: 'INR',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    taxPercent: 5,
    lowStockThreshold: 5,
    onlineOrdering: true,
    reservations: true
  },
  ai: { budgetInr: modelsJson.budgetLimitInr, defaultModel: 'auto' },
  payments: {
    cash: true,
    cardOnDelivery: true,
    payOnCollection: true,
    // Off until the owner enters their own UPI ID — never send money to a placeholder VPA.
    upiQr: false,
    upiId: '',
    upiPayeeName: 'Saffron Table',
    razorpay: true,
    stripe: true,
    holdMinutes: 30
  }
};

export async function getSetting<K extends keyof SettingsMap>(key: K): Promise<SettingsMap[K]> {
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (!row) return DEFAULT_SETTINGS[key];
    return { ...DEFAULT_SETTINGS[key], ...(row.value as object) } as SettingsMap[K];
  } catch {
    // Database not initialised yet (first boot / build) — fall back to defaults.
    return DEFAULT_SETTINGS[key];
  }
}

export async function getAllSettings(): Promise<SettingsMap> {
  const [brand, theme, business, ai, payments] = await Promise.all([
    getSetting('brand'),
    getSetting('theme'),
    getSetting('business'),
    getSetting('ai'),
    getSetting('payments')
  ]);
  return { brand, theme, business, ai, payments };
}

export async function updateSetting<K extends keyof SettingsMap>(
  key: K,
  patch: Partial<SettingsMap[K]>
): Promise<SettingsMap[K]> {
  const current = await getSetting(key);
  const value = { ...current, ...patch };
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  return value;
}
