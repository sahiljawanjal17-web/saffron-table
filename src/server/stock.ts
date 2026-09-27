import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dailyStock, menuItems } from '@/db/schema';
import { getSetting } from '@/lib/settings';
import { dateInTz } from '@/lib/time';

export async function today() {
  const { timezone } = await getSetting('business');
  return dateInTz(new Date(), timezone);
}

/**
 * Make sure every active *permanent* item has a stock row for the date, seeded with
 * its default daily quantity. Idempotent — safe to call on every page load.
 */
export async function ensureDay(date: string) {
  const permanent = await db
    .select({ id: menuItems.id, qty: menuItems.defaultDailyQty })
    .from(menuItems)
    .where(and(eq(menuItems.isPermanent, true), eq(menuItems.active, true)));
  if (!permanent.length) return;
  await db
    .insert(dailyStock)
    .values(permanent.map((p) => ({ date, menuItemId: p.id, openingQty: p.qty })))
    .onConflictDoNothing();
}

export type StockRow = {
  stockId: number;
  menuItemId: number;
  name: string;
  category: string;
  kind: 'dish' | 'raw';
  unit: string;
  price: number;
  isVeg: boolean;
  isPermanent: boolean;
  isSignature: boolean;
  description: string | null;
  imageUrl: string | null;
  openingQty: number;
  adjustQty: number;
  soldQty: number;
  remaining: number;
};

export async function getStockForDate(date: string, opts: { onlyDishes?: boolean } = {}) {
  await ensureDay(date);
  const rows = await db
    .select({
      stockId: dailyStock.id,
      menuItemId: menuItems.id,
      name: menuItems.name,
      category: menuItems.category,
      kind: menuItems.kind,
      unit: menuItems.unit,
      price: menuItems.price,
      isVeg: menuItems.isVeg,
      isPermanent: menuItems.isPermanent,
      isSignature: menuItems.isSignature,
      description: menuItems.description,
      imageUrl: menuItems.imageUrl,
      openingQty: dailyStock.openingQty,
      adjustQty: dailyStock.adjustQty,
      soldQty: dailyStock.soldQty
    })
    .from(dailyStock)
    .innerJoin(menuItems, eq(menuItems.id, dailyStock.menuItemId))
    .where(
      and(
        eq(dailyStock.date, date),
        eq(menuItems.active, true),
        opts.onlyDishes ? eq(menuItems.kind, 'dish') : undefined
      )
    )
    .orderBy(asc(menuItems.category), asc(menuItems.name));

  return rows.map<StockRow>((r) => ({
    ...r,
    remaining: Math.max(0, r.openingQty + r.adjustQty - r.soldQty)
  }));
}

/** Customer-facing menu: today's dishes with stock info. */
export async function getLiveMenu() {
  const date = await today();
  const rows = await getStockForDate(date, { onlyDishes: true });
  return { date, items: rows };
}

export async function addItemsToDay(date: string, entries: { menuItemId: number; qty: number }[]) {
  if (!entries.length) return;
  for (const e of entries) {
    await db
      .insert(dailyStock)
      .values({ date, menuItemId: e.menuItemId, openingQty: e.qty })
      .onConflictDoUpdate({
        target: [dailyStock.date, dailyStock.menuItemId],
        set: { openingQty: e.qty }
      });
  }
}

export async function setOpeningQty(stockId: number, qty: number) {
  await db.update(dailyStock).set({ openingQty: Math.max(0, qty) }).where(eq(dailyStock.id, stockId));
}

export async function adjustStock(stockId: number, delta: number) {
  await db
    .update(dailyStock)
    .set({ adjustQty: sql`${dailyStock.adjustQty} + ${delta}` })
    .where(eq(dailyStock.id, stockId));
}

export async function removeFromDay(stockId: number) {
  await db.delete(dailyStock).where(and(eq(dailyStock.id, stockId), eq(dailyStock.soldQty, 0)));
}

/** Mark as sold out for the day by adjusting remaining to zero. */
export async function markSoldOut(date: string, menuItemIds: number[]) {
  if (!menuItemIds.length) return;
  await db
    .update(dailyStock)
    .set({ adjustQty: sql`${dailyStock.soldQty} - ${dailyStock.openingQty}` })
    .where(and(eq(dailyStock.date, date), inArray(dailyStock.menuItemId, menuItemIds)));
}
