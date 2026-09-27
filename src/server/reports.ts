import { and, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dayClosings, orderItems, orders, reservations } from '@/db/schema';
import { getAllSettings } from '@/lib/settings';
import { formatMoney, formatQty, round2 } from '@/lib/money';
import { formatDateTime, hourInTz, prettyDate } from '@/lib/time';
import { getStockForDate } from './stock';

export type DaySummary = Awaited<ReturnType<typeof buildDaySummary>>;

export async function buildDaySummary(date: string) {
  const { business } = await getAllSettings();
  const dayOrders = await db.select().from(orders).where(eq(orders.businessDate, date));
  const valid = dayOrders.filter((o) => o.status !== 'cancelled');

  const sum = (list: typeof valid, f: (o: (typeof valid)[number]) => number) =>
    round2(list.reduce((s, o) => s + f(o), 0));

  const groupCount = (key: 'type' | 'status' | 'paymentMethod' | 'paymentStatus' | 'source', list = dayOrders) => {
    const out: Record<string, { count: number; total: number }> = {};
    for (const o of list) {
      const k = String(o[key]);
      out[k] ??= { count: 0, total: 0 };
      out[k].count += 1;
      out[k].total = round2(out[k].total + (o.status === 'cancelled' ? 0 : o.total));
    }
    return out;
  };

  const itemsSold = await db
    .select({
      name: orderItems.name,
      qty: sql<number>`sum(${orderItems.qty})`,
      revenue: sql<number>`sum(${orderItems.qty} * ${orderItems.price})`
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.businessDate, date), ne(orders.status, 'cancelled')))
    .groupBy(orderItems.name)
    .orderBy(sql`sum(${orderItems.qty}) desc`);

  const hours: Record<number, number> = {};
  for (const o of valid) {
    const h = hourInTz(new Date(o.createdAt), business.timezone);
    hours[h] = round2((hours[h] ?? 0) + o.total);
  }
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];

  const stock = await getStockForDate(date);
  const dayReservations = await db.select().from(reservations).where(eq(reservations.date, date));

  return {
    date,
    generatedAt: new Date().toISOString(),
    totals: {
      orders: valid.length,
      cancelled: dayOrders.length - valid.length,
      subtotal: sum(valid, (o) => o.subtotal),
      tax: sum(valid, (o) => o.tax),
      revenue: sum(valid, (o) => o.total),
      avgOrderValue: valid.length ? round2(sum(valid, (o) => o.total) / valid.length) : 0,
      itemsSold: round2(itemsSold.reduce((s, i) => s + Number(i.qty), 0))
    },
    byType: groupCount('type'),
    byStatus: groupCount('status'),
    byPayment: groupCount('paymentMethod', valid),
    byPaymentStatus: groupCount('paymentStatus', valid),
    collected: sum(valid.filter((o) => o.paymentStatus === 'paid'), (o) => o.total),
    outstanding: sum(valid.filter((o) => o.paymentStatus !== 'paid'), (o) => o.total),
    bySource: groupCount('source', valid),
    pendingOrders: dayOrders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length,
    peakHour: peak ? { hour: Number(peak[0]), revenue: peak[1] } : null,
    hourly: hours,
    itemsSold: itemsSold.map((i) => ({ name: i.name, qty: Number(i.qty), revenue: round2(Number(i.revenue)) })),
    stock: stock.map((s) => ({
      name: s.name,
      kind: s.kind,
      unit: s.unit,
      opening: s.openingQty + s.adjustQty,
      sold: s.soldQty,
      remaining: s.remaining
    })),
    lowStock: stock
      .filter((s) => s.remaining <= business.lowStockThreshold)
      .map((s) => ({ name: s.name, remaining: s.remaining, unit: s.unit })),
    reservations: {
      total: dayReservations.length,
      guests: dayReservations
        .filter((r) => r.status !== 'cancelled')
        .reduce((s, r) => s + r.partySize, 0),
      byStatus: dayReservations.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      }, {})
    }
  };
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n));
const padL = (s: string, n: number) => s.padStart(n);

export async function daySummaryText(summary: DaySummary) {
  const { brand, business } = await getAllSettings();
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const W = 48;
  const line = '='.repeat(W);
  const thin = '-'.repeat(W);
  const out: string[] = [];

  out.push(line, brand.name.toUpperCase(), 'END OF DAY REPORT', prettyDate(summary.date), line);
  out.push(`Generated: ${formatDateTime(summary.generatedAt, business.timezone, business.locale)}`, '');

  out.push('SALES', thin);
  out.push(`${pad('Orders completed/active', 32)}${padL(String(summary.totals.orders), 16)}`);
  out.push(`${pad('Cancelled orders', 32)}${padL(String(summary.totals.cancelled), 16)}`);
  out.push(`${pad('Subtotal', 32)}${padL(money(summary.totals.subtotal), 16)}`);
  out.push(`${pad('Tax', 32)}${padL(money(summary.totals.tax), 16)}`);
  out.push(`${pad('TOTAL REVENUE', 32)}${padL(money(summary.totals.revenue), 16)}`);
  out.push(`${pad('Average order value', 32)}${padL(money(summary.totals.avgOrderValue), 16)}`);
  if (summary.peakHour) {
    out.push(`${pad('Peak hour', 32)}${padL(`${String(summary.peakHour.hour).padStart(2, '0')}:00`, 16)}`);
  }
  out.push('');

  const section = (title: string, rec: Record<string, { count: number; total: number }>) => {
    out.push(title, thin);
    for (const [k, v] of Object.entries(rec)) {
      out.push(`${pad(k.replace('_', ' '), 22)}${padL(String(v.count), 8)}${padL(money(v.total), 18)}`);
    }
    out.push('');
  };
  section('ORDERS BY TYPE', summary.byType);
  section('ORDERS BY STATUS', summary.byStatus);
  section('PAYMENTS BY METHOD', summary.byPayment);
  section('PAYMENT STATUS', summary.byPaymentStatus);
  out.push(`${pad('Collected', 32)}${padL(money(summary.collected), 16)}`);
  out.push(`${pad('Outstanding (unpaid)', 32)}${padL(money(summary.outstanding), 16)}`, '');

  out.push('ITEMS SOLD', thin);
  for (const i of summary.itemsSold) {
    out.push(`${pad(i.name, 26)}${padL(formatQty(i.qty), 6)}${padL(money(i.revenue), 16)}`);
  }
  if (!summary.itemsSold.length) out.push('No items sold');
  out.push('');

  out.push('INVENTORY STATUS', thin, `${pad('Item', 24)}${padL('Open', 8)}${padL('Sold', 8)}${padL('Left', 8)}`);
  for (const s of summary.stock) {
    out.push(
      `${pad(s.name, 24)}${padL(formatQty(s.opening), 8)}${padL(formatQty(s.sold), 8)}${padL(formatQty(s.remaining), 8)}`
    );
  }
  out.push('');

  if (summary.lowStock.length) {
    out.push('LOW / OUT OF STOCK', thin);
    for (const s of summary.lowStock) out.push(`- ${s.name}: ${formatQty(s.remaining)} ${s.unit}`);
    out.push('');
  }

  out.push('RESERVATIONS', thin);
  out.push(`${pad('Bookings', 32)}${padL(String(summary.reservations.total), 16)}`);
  out.push(`${pad('Guests expected', 32)}${padL(String(summary.reservations.guests), 16)}`);
  out.push(`${pad('Open orders still in progress', 32)}${padL(String(summary.pendingOrders), 16)}`);
  out.push('', line);
  return out.join('\n');
}

export async function closeDay(date: string) {
  const summary = await buildDaySummary(date);
  await db
    .insert(dayClosings)
    .values({ date, summary })
    .onConflictDoUpdate({ target: dayClosings.date, set: { summary, createdAt: new Date().toISOString() } });
  return summary;
}

export async function listClosings(limit = 30) {
  return db.query.dayClosings.findMany({
    orderBy: (t, { desc }) => [desc(t.date)],
    limit
  });
}

export async function revenueBetween(from: string, to: string) {
  const [row] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      count: sql<number>`count(*)`
    })
    .from(orders)
    .where(and(gte(orders.businessDate, from), lte(orders.businessDate, to), ne(orders.status, 'cancelled')));
  return { revenue: round2(Number(row.revenue)), count: Number(row.count) };
}
