import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { monthlyRevenue, orderItems, orders, reservations, salaryPayments } from '@/db/schema';
import { round2 } from '@/lib/money';
import { addDays, monthOf } from '@/lib/time';
import { today } from './stock';

/** Revenue + order count per day for the last N days (zero-filled). */
export async function dailySeries(days: number, end?: string) {
  const to = end ?? (await today());
  const from = addDays(to, -(days - 1));
  const rows = await db
    .select({
      date: orders.businessDate,
      revenue: sql<number>`sum(${orders.total})`,
      orders: sql<number>`count(*)`
    })
    .from(orders)
    .where(and(gte(orders.businessDate, from), lte(orders.businessDate, to), ne(orders.status, 'cancelled')))
    .groupBy(orders.businessDate);
  const map = new Map(rows.map((r) => [r.date, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const r = map.get(date);
    return { date, revenue: round2(Number(r?.revenue ?? 0)), orders: Number(r?.orders ?? 0) };
  });
}

/** Units sold per item per day in a date range. */
export async function itemDailySales(from: string, to: string) {
  return db
    .select({
      date: orders.businessDate,
      menuItemId: orderItems.menuItemId,
      name: orderItems.name,
      qty: sql<number>`sum(${orderItems.qty})`,
      revenue: sql<number>`sum(${orderItems.qty} * ${orderItems.price})`
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(gte(orders.businessDate, from), lte(orders.businessDate, to), ne(orders.status, 'cancelled')))
    .groupBy(orders.businessDate, orderItems.menuItemId, orderItems.name);
}

export async function topItems(days: number, limit = 8) {
  const to = await today();
  const from = addDays(to, -(days - 1));
  const rows = await db
    .select({
      name: orderItems.name,
      qty: sql<number>`sum(${orderItems.qty})`,
      revenue: sql<number>`sum(${orderItems.qty} * ${orderItems.price})`
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(gte(orders.businessDate, from), lte(orders.businessDate, to), ne(orders.status, 'cancelled')))
    .groupBy(orderItems.name)
    .orderBy(sql`sum(${orderItems.qty} * ${orderItems.price}) desc`)
    .limit(limit);
  return rows.map((r) => ({ name: r.name, qty: Number(r.qty), revenue: round2(Number(r.revenue)) }));
}

export async function orderTypeMix(days: number) {
  const to = await today();
  const from = addDays(to, -(days - 1));
  const rows = await db
    .select({ type: orders.type, count: sql<number>`count(*)`, revenue: sql<number>`sum(${orders.total})` })
    .from(orders)
    .where(and(gte(orders.businessDate, from), ne(orders.status, 'cancelled')))
    .groupBy(orders.type);
  return rows.map((r) => ({ type: r.type, count: Number(r.count), revenue: round2(Number(r.revenue)) }));
}

/**
 * Month-by-month finance: revenue from orders merged with manually entered past
 * months (manual value wins only when the system has no orders for that month).
 */
export async function monthlyFinance(months = 12) {
  const end = await today();
  const monthsList: string[] = [];
  const d = new Date(`${monthOf(end)}-01T00:00:00Z`);
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    monthsList.push(m.toISOString().slice(0, 7));
  }

  const orderRows = await db
    .select({
      month: sql<string>`substr(${orders.businessDate}, 1, 7)`,
      revenue: sql<number>`sum(${orders.total})`,
      count: sql<number>`count(*)`
    })
    .from(orders)
    .where(and(gte(orders.businessDate, `${monthsList[0]}-01`), ne(orders.status, 'cancelled')))
    .groupBy(sql`substr(${orders.businessDate}, 1, 7)`);
  const manual = await db.select().from(monthlyRevenue);
  const salaries = await db
    .select({ month: salaryPayments.month, total: sql<number>`sum(${salaryPayments.amount})` })
    .from(salaryPayments)
    .groupBy(salaryPayments.month);

  const om = new Map(orderRows.map((r) => [r.month, r]));
  const mm = new Map(manual.map((r) => [r.month, r]));
  const sm = new Map(salaries.map((r) => [r.month, Number(r.total)]));

  return monthsList.map((month) => {
    const o = om.get(month);
    const m = mm.get(month);
    const systemRevenue = round2(Number(o?.revenue ?? 0));
    const revenue = systemRevenue > 0 ? systemRevenue : (m?.revenue ?? 0);
    const salary = round2(sm.get(month) ?? 0);
    const expenses = round2(m?.expenses ?? 0);
    return {
      month,
      revenue,
      source: systemRevenue > 0 ? ('orders' as const) : m?.revenue != null ? ('manual' as const) : ('none' as const),
      orders: Number(o?.count ?? 0),
      salaries: salary,
      expenses,
      net: round2(revenue - salary - expenses),
      note: m?.note ?? null
    };
  });
}

export async function upcomingReservations(limit = 6) {
  const t = await today();
  return db
    .select()
    .from(reservations)
    .where(and(gte(reservations.date, t), ne(reservations.status, 'cancelled')))
    .orderBy(reservations.date, reservations.time)
    .limit(limit);
}

export async function recentOrders(limit = 6) {
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}
