import { and, eq, like } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { menuItems } from '@/db/schema';
import { chat, extractJson, type ChatMessage } from '@/lib/ai/client';
import { getAllSettings, updateSetting } from '@/lib/settings';
import { THEME_PRESETS, sanitizeBrandColor } from '@/lib/theme-presets';
import { formatMoney } from '@/lib/money';
import { buildDaySummary } from './reports';
import { addItemsToDay, getStockForDate, markSoldOut, today } from './stock';
import { topItems } from './analytics';

/** Every change the assistant can make. Validated before anything touches the DB. */
const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('set_theme_preset'), preset: z.enum(THEME_PRESETS.map((t) => t.value) as [string, ...string[]]) }),
  z.object({
    type: z.literal('set_colors'),
    primary: z.string().optional(),
    accent: z.string().optional(),
    reset: z.boolean().optional()
  }),
  z.object({ type: z.literal('set_radius'), rem: z.number().min(0).max(1.25) }),
  z.object({
    type: z.literal('set_brand'),
    name: z.string().max(60).optional(),
    tagline: z.string().max(80).optional(),
    heroTitle: z.string().max(120).optional(),
    heroSubtitle: z.string().max(300).optional(),
    about: z.string().max(800).optional(),
    phone: z.string().max(30).optional(),
    email: z.string().max(80).optional(),
    address: z.string().max(200).optional(),
    hours: z.string().max(120).optional(),
    instagram: z.string().max(60).optional()
  }),
  z.object({ type: z.literal('set_tax'), percent: z.number().min(0).max(40) }),
  z.object({ type: z.literal('toggle_online_ordering'), enabled: z.boolean() }),
  z.object({ type: z.literal('toggle_reservations'), enabled: z.boolean() }),
  z.object({ type: z.literal('set_price'), item: z.string(), price: z.number().min(0) }),
  z.object({ type: z.literal('mark_sold_out'), item: z.string() }),
  z.object({ type: z.literal('set_today_stock'), item: z.string(), qty: z.number().min(0) })
]);

type Action = z.infer<typeof actionSchema>;

async function findItem(name: string) {
  const exact = await db.query.menuItems.findFirst({ where: and(eq(menuItems.active, true), eq(menuItems.name, name)) });
  if (exact) return exact;
  return db.query.menuItems.findFirst({ where: and(eq(menuItems.active, true), like(menuItems.name, `%${name}%`)) });
}

async function applyAction(action: Action): Promise<string> {
  switch (action.type) {
    case 'set_theme_preset':
      await updateSetting('theme', { preset: action.preset, primary: null, accent: null });
      return `Theme changed to ${THEME_PRESETS.find((t) => t.value === action.preset)?.name}`;
    case 'set_colors': {
      if (action.reset) {
        await updateSetting('theme', { primary: null, accent: null });
        return 'Custom colours cleared';
      }
      const patch: { primary?: string; accent?: string } = {};
      const notes: string[] = [];
      for (const key of ['primary', 'accent'] as const) {
        const raw = action[key];
        if (!raw) continue;
        const safe = sanitizeBrandColor(raw);
        if (!safe) {
          notes.push(`${key} "${raw}" is not a valid hex colour`);
          continue;
        }
        patch[key] = safe.color;
        notes.push(`${key} → ${safe.color}${safe.adjusted ? ' (toned down to stay premium, no neon)' : ''}`);
      }
      if (Object.keys(patch).length) await updateSetting('theme', patch);
      return `Colours: ${notes.join('; ')}`;
    }
    case 'set_radius':
      await updateSetting('theme', { radius: action.rem });
      return `Corner radius set to ${action.rem}rem`;
    case 'set_brand': {
      const { type: _type, ...patch } = action;
      const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      await updateSetting('brand', clean);
      return `Updated ${Object.keys(clean).join(', ')}`;
    }
    case 'set_tax':
      await updateSetting('business', { taxPercent: action.percent });
      return `Tax set to ${action.percent}%`;
    case 'toggle_online_ordering':
      await updateSetting('business', { onlineOrdering: action.enabled });
      return `Online ordering ${action.enabled ? 'enabled' : 'paused'}`;
    case 'toggle_reservations':
      await updateSetting('business', { reservations: action.enabled });
      return `Reservations ${action.enabled ? 'enabled' : 'closed'}`;
    case 'set_price': {
      const item = await findItem(action.item);
      if (!item) return `Could not find "${action.item}"`;
      await db.update(menuItems).set({ price: action.price }).where(eq(menuItems.id, item.id));
      return `${item.name} price set to ${action.price}`;
    }
    case 'mark_sold_out': {
      const item = await findItem(action.item);
      if (!item) return `Could not find "${action.item}"`;
      await markSoldOut(await today(), [item.id]);
      return `${item.name} marked sold out for today`;
    }
    case 'set_today_stock': {
      const item = await findItem(action.item);
      if (!item) return `Could not find "${action.item}"`;
      await addItemsToDay(await today(), [{ menuItemId: item.id, qty: action.qty }]);
      return `${item.name} opening stock for today set to ${action.qty}`;
    }
  }
}

async function contextBlock() {
  const date = await today();
  const [settings, summary, stock, top] = await Promise.all([
    getAllSettings(),
    buildDaySummary(date),
    getStockForDate(date),
    topItems(30, 5)
  ]);
  const money = (n: number) => formatMoney(n, settings.business.currency, settings.business.locale);
  return [
    `Today: ${date}`,
    `Brand: ${JSON.stringify(settings.brand)}`,
    `Theme: ${JSON.stringify(settings.theme)} (presets: ${THEME_PRESETS.map((t) => `${t.value} = ${t.description}`).join(' | ')})`,
    `Business: ${JSON.stringify(settings.business)}`,
    `Today so far: revenue ${money(summary.totals.revenue)}, ${summary.totals.orders} orders, ${summary.pendingOrders} open, ${summary.reservations.guests} guests booked.`,
    `Today's stock (name: remaining/opening): ${stock.map((s) => `${s.name}: ${s.remaining}/${s.openingQty + s.adjustQty} ${s.unit}`).join('; ')}`,
    `Top dishes last 30 days: ${top.map((t) => `${t.name} (${t.qty} sold, ${money(t.revenue)})`).join('; ')}`
  ].join('\n');
}

const SYSTEM = `You are the operations assistant inside a premium restaurant's admin panel.
You can answer questions about the business and change the website through ACTIONS.

Reply with ONE JSON object and nothing else:
{"reply": "<short helpful answer for the owner>", "actions": [ ...zero or more actions ]}

Available actions:
- {"type":"set_theme_preset","preset":"saffron-noir|olive-grove|terracotta|classic-ivory"}
- {"type":"set_colors","primary":"#hex","accent":"#hex"}  or {"type":"set_colors","reset":true}
- {"type":"set_radius","rem":0.625}
- {"type":"set_brand","name":"","tagline":"","heroTitle":"","heroSubtitle":"","about":"","phone":"","email":"","address":"","hours":"","instagram":""} (only include fields to change)
- {"type":"set_tax","percent":5}
- {"type":"toggle_online_ordering","enabled":true}
- {"type":"toggle_reservations","enabled":true}
- {"type":"set_price","item":"<dish name>","price":450}
- {"type":"mark_sold_out","item":"<dish name>"}
- {"type":"set_today_stock","item":"<item name>","qty":30}

Design rules (strict): the brand is premium hospitality. Never use neon, electric blue, cyberpunk,
gaming or glowing colours. Prefer deep, warm, earthy or classic tones (charcoal, ivory, gold, wine,
olive, terracotta, bottle green, navy only when dark and muted). If the owner asks for something
garish, suggest an elegant alternative and apply that instead, explaining why.
Only include actions the owner actually asked for. Questions need no actions.
Reply in the same language the owner writes in (Hindi, Hinglish or English).`;

export async function runAssistant(history: { role: 'user' | 'assistant'; content: string }[], model: string) {
  const messages: ChatMessage[] = [
    { role: 'system', content: `${SYSTEM}\n\nCURRENT DATA\n${await contextBlock()}` },
    ...history.slice(-12)
  ];
  const result = await chat('assistant', model, messages, { temperature: 0.3 });
  const parsed = extractJson<{ reply?: unknown; actions?: unknown[] }>(result.text);

  const applied: { action: string; result: string; ok: boolean }[] = [];
  if (parsed && Array.isArray(parsed.actions)) {
    for (const raw of parsed.actions.slice(0, 10)) {
      const check = actionSchema.safeParse(raw);
      if (!check.success) {
        applied.push({ action: String((raw as { type?: string })?.type ?? 'unknown'), result: 'Rejected: invalid action', ok: false });
        continue;
      }
      try {
        applied.push({ action: check.data.type, result: await applyAction(check.data), ok: true });
      } catch (e) {
        applied.push({ action: check.data.type, result: e instanceof Error ? e.message : 'Failed', ok: false });
      }
    }
  }

  return {
    reply: typeof parsed?.reply === 'string' ? parsed.reply : result.text,
    applied,
    model: result.modelName,
    usedBackup: result.usedBackup,
    costInr: result.costInr
  };
}
