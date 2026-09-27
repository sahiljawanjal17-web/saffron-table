import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  ORDER_STATUSES,
  ORDER_TYPES,
  PAYMENT_METHODS,
  dailyStock,
  menuItems,
  orderItems,
  orders,
  reservationItems,
  reservations
} from '@/db/schema';
import { getSetting } from '@/lib/settings';
import { COUNTER_METHODS, customerMethods } from '@/lib/payment-methods';
import { round2 } from '@/lib/money';
import { today } from './stock';

export class OrderError extends Error {}

const lineSchema = z.object({
  menuItemId: z.number().int().positive(),
  qty: z.number().positive().max(100)
});

export const orderInputSchema = z.object({
  customerName: z.string().trim().min(1, 'Name is required').max(80),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  address: z.string().trim().max(300).optional().or(z.literal('')),
  type: z.enum(ORDER_TYPES),
  paymentMethod: z.enum(PAYMENT_METHODS).default('cash'),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(lineSchema).min(1, 'Cart is empty').max(50)
});

export type OrderInput = z.infer<typeof orderInputSchema>;

function randomCode(prefix: string) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${s}`;
}

function mergeLines(lines: { menuItemId: number; qty: number }[]) {
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.menuItemId, (map.get(l.menuItemId) ?? 0) + l.qty);
  return [...map.entries()].map(([menuItemId, qty]) => ({ menuItemId, qty }));
}

/**
 * Place an order and deduct today's stock atomically.
 * Each stock update only succeeds if enough quantity remains; if any line fails the
 * whole transaction rolls back, so parallel orders can never oversell.
 */
export async function placeOrder(raw: unknown, source: 'counter' | 'online') {
  const input = orderInputSchema.parse(raw);
  const lines = mergeLines(input.items);
  const [date, business, payments] = await Promise.all([today(), getSetting('business'), getSetting('payments')]);

  if (source === 'online' && !business.onlineOrdering) {
    throw new OrderError('Online ordering is currently paused.');
  }
  const allowed =
    source === 'counter'
      ? [...COUNTER_METHODS.map((m) => m.value), ...customerMethods(payments, input.type).map((m) => m.value)]
      : customerMethods(payments, input.type).map((m) => m.value);
  if (!allowed.includes(input.paymentMethod)) {
    throw new OrderError('This payment method is not available for this order.');
  }
  // Counter sales in cash/UPI/card are settled on the spot.
  const paidNow = source === 'counter' && ['cash', 'upi', 'card'].includes(input.paymentMethod);

  if (input.type === 'delivery' && !input.address) {
    throw new OrderError('Delivery address is required.');
  }

  const items = await db
    .select()
    .from(menuItems)
    .where(inArray(menuItems.id, lines.map((l) => l.menuItemId)));
  const byId = new Map(items.map((i) => [i.id, i]));

  for (const l of lines) {
    const item = byId.get(l.menuItemId);
    if (!item || !item.active || item.kind !== 'dish') {
      throw new OrderError('One of the items is no longer available.');
    }
  }

  const subtotal = round2(lines.reduce((s, l) => s + byId.get(l.menuItemId)!.price * l.qty, 0));
  const tax = round2((subtotal * business.taxPercent) / 100);
  const total = round2(subtotal + tax);

  return db.transaction(async (tx) => {
    for (const l of lines) {
      const updated = await tx
        .update(dailyStock)
        .set({ soldQty: sql`${dailyStock.soldQty} + ${l.qty}` })
        .where(
          and(
            eq(dailyStock.date, date),
            eq(dailyStock.menuItemId, l.menuItemId),
            sql`${dailyStock.openingQty} + ${dailyStock.adjustQty} - ${dailyStock.soldQty} >= ${l.qty}`
          )
        )
        .returning({ id: dailyStock.id });
      if (!updated.length) {
        throw new OrderError(`${byId.get(l.menuItemId)!.name} is sold out or has less stock left.`);
      }
    }

    let code = randomCode('OR');
    for (let i = 0; i < 5; i++) {
      const clash = await tx.select({ id: orders.id }).from(orders).where(eq(orders.code, code));
      if (!clash.length) break;
      code = randomCode('OR');
    }

    const [order] = await tx
      .insert(orders)
      .values({
        code,
        customerName: input.customerName,
        phone: input.phone || null,
        address: input.address || null,
        type: input.type,
        source,
        status: source === 'counter' && input.type !== 'delivery' ? 'preparing' : 'pending',
        paymentMethod: input.paymentMethod,
        paymentStatus: paidNow ? 'paid' : 'unpaid',
        paidAt: paidNow ? new Date().toISOString() : null,
        subtotal,
        tax,
        total,
        notes: input.notes || null,
        businessDate: date
      })
      .returning();

    await tx.insert(orderItems).values(
      lines.map((l) => {
        const item = byId.get(l.menuItemId)!;
        return { orderId: order.id, menuItemId: item.id, name: item.name, price: item.price, qty: l.qty };
      })
    );

    return order;
  });
}

export async function getOrderWithItems(where: { id?: number; code?: string }) {
  const order = await db.query.orders.findFirst({
    where: where.id ? eq(orders.id, where.id) : eq(orders.code, where.code ?? '')
  });
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function listOrders(opts: { date?: string; status?: string; limit?: number } = {}) {
  return db
    .select()
    .from(orders)
    .where(
      and(
        opts.date ? eq(orders.businessDate, opts.date) : undefined,
        opts.status ? eq(orders.status, opts.status as (typeof ORDER_STATUSES)[number]) : undefined
      )
    )
    .orderBy(desc(orders.createdAt))
    .limit(opts.limit ?? 200);
}

/** Status change. Cancelling returns the quantity to that day's stock. */
export async function setOrderStatus(id: number, status: (typeof ORDER_STATUSES)[number]) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id));
    if (!order) throw new OrderError('Order not found');
    if (order.status === status) return;
    if (order.status === 'cancelled') throw new OrderError('Cancelled orders cannot be reopened.');

    if (status === 'cancelled') {
      const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, id));
      for (const l of lines) {
        await tx
          .update(dailyStock)
          .set({ soldQty: sql`max(0, ${dailyStock.soldQty} - ${l.qty})` })
          .where(and(eq(dailyStock.date, order.businessDate), eq(dailyStock.menuItemId, l.menuItemId)));
      }
    }
    await tx.update(orders).set({ status }).where(eq(orders.id, id));
  });
}

// ---------------------------------------------------------------------------
// Reservations (+ optional pre-order)
// ---------------------------------------------------------------------------

export const reservationInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  phone: z.string().trim().min(6, 'Phone is required').max(20),
  email: z.string().trim().email().optional().or(z.literal('')),
  partySize: z.number().int().min(1).max(40),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  items: z.array(lineSchema).max(50).default([])
});

export async function createReservation(raw: unknown) {
  const input = reservationInputSchema.parse(raw);
  const business = await getSetting('business');
  if (!business.reservations) throw new OrderError('Reservations are currently closed.');
  if (input.date < (await today())) throw new OrderError('Please choose a future date.');

  const lines = mergeLines(input.items);
  const items = lines.length
    ? await db.select().from(menuItems).where(inArray(menuItems.id, lines.map((l) => l.menuItemId)))
    : [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const validLines = lines.filter((l) => byId.get(l.menuItemId)?.active);
  const preorderTotal = round2(
    validLines.reduce((s, l) => s + byId.get(l.menuItemId)!.price * l.qty, 0)
  );

  return db.transaction(async (tx) => {
    const [reservation] = await tx
      .insert(reservations)
      .values({
        code: randomCode('RS'),
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        partySize: input.partySize,
        date: input.date,
        time: input.time,
        notes: input.notes || null,
        preorderTotal
      })
      .returning();
    if (validLines.length) {
      await tx.insert(reservationItems).values(
        validLines.map((l) => {
          const item = byId.get(l.menuItemId)!;
          return {
            reservationId: reservation.id,
            menuItemId: item.id,
            name: item.name,
            price: item.price,
            qty: l.qty
          };
        })
      );
    }
    return reservation;
  });
}
