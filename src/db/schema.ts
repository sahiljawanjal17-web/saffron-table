import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

const id = () => integer('id').primaryKey({ autoIncrement: true });
const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);

/** Key/value JSON settings: brand, theme, tax, hours, ai budget. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull()
});

export const staff = sqliteTable('staff', {
  id: id(),
  name: text('name').notNull(),
  role: text('role').notNull().default('Staff'),
  phone: text('phone'),
  email: text('email'),
  joinDate: text('join_date'),
  salary: real('salary'),
  status: text('status', { enum: ['active', 'on_leave', 'inactive'] })
    .notNull()
    .default('active'),
  notes: text('notes'),
  createdAt: createdAt()
});

export const salaryPayments = sqliteTable(
  'salary_payments',
  {
    id: id(),
    staffId: integer('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    month: text('month').notNull(), // YYYY-MM
    amount: real('amount').notNull(),
    paidOn: text('paid_on').notNull(),
    note: text('note'),
    createdAt: createdAt()
  },
  (t) => [index('salary_month_idx').on(t.month)]
);

/** Manually entered figures for months before the system was used, plus expenses. */
export const monthlyRevenue = sqliteTable('monthly_revenue', {
  id: id(),
  month: text('month').notNull().unique(), // YYYY-MM
  revenue: real('revenue'),
  expenses: real('expenses'),
  note: text('note')
});

export const menuItems = sqliteTable('menu_items', {
  id: id(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull().default('Mains'),
  kind: text('kind', { enum: ['dish', 'raw'] })
    .notNull()
    .default('dish'),
  price: real('price').notNull().default(0),
  unit: text('unit').notNull().default('plate'),
  imageUrl: text('image_url'),
  isVeg: integer('is_veg', { mode: 'boolean' }).notNull().default(true),
  isPermanent: integer('is_permanent', { mode: 'boolean' }).notNull().default(false),
  isSignature: integer('is_signature', { mode: 'boolean' }).notNull().default(false),
  defaultDailyQty: real('default_daily_qty').notNull().default(0),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: createdAt()
});

export const dailyStock = sqliteTable(
  'daily_stock',
  {
    id: id(),
    date: text('date').notNull(), // YYYY-MM-DD in restaurant timezone
    menuItemId: integer('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    openingQty: real('opening_qty').notNull().default(0),
    soldQty: real('sold_qty').notNull().default(0),
    adjustQty: real('adjust_qty').notNull().default(0)
  },
  (t) => [uniqueIndex('daily_stock_date_item').on(t.date, t.menuItemId)]
);

export const diningTables = sqliteTable('dining_tables', {
  id: id(),
  label: text('label').notNull(),
  capacity: integer('capacity').notNull().default(4)
});

export const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery', 'online'] as const;
export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
/** awaiting = sent to a gateway / UPI, waiting for confirmation. */
export const PAYMENT_STATUSES = ['unpaid', 'awaiting', 'paid', 'failed', 'refunded'] as const;
export const PAYMENT_METHODS = [
  'cash',
  'card_on_delivery',
  'pay_on_collection',
  'upi_qr',
  'razorpay',
  'stripe',
  'upi',
  'card'
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const orders = sqliteTable(
  'orders',
  {
    id: id(),
    code: text('code').notNull().unique(),
    customerName: text('customer_name').notNull(),
    phone: text('phone'),
    address: text('address'),
    type: text('type', { enum: ORDER_TYPES }).notNull().default('dine_in'),
    source: text('source', { enum: ['counter', 'online'] })
      .notNull()
      .default('counter'),
    status: text('status', { enum: ORDER_STATUSES }).notNull().default('pending'),
    paymentMethod: text('payment_method').notNull().default('cash'),
    paymentStatus: text('payment_status', { enum: PAYMENT_STATUSES }).notNull().default('unpaid'),
    paymentRef: text('payment_ref'), // gateway order/session id or UPI transaction ref
    paidAt: text('paid_at'),
    subtotal: real('subtotal').notNull(),
    tax: real('tax').notNull(),
    total: real('total').notNull(),
    notes: text('notes'),
    businessDate: text('business_date').notNull(),
    createdAt: createdAt()
  },
  (t) => [index('orders_business_date').on(t.businessDate)]
);

export const orderItems = sqliteTable('order_items', {
  id: id(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: integer('menu_item_id').notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  qty: real('qty').notNull()
});

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled'] as const;

export const reservations = sqliteTable(
  'reservations',
  {
    id: id(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    email: text('email'),
    partySize: integer('party_size').notNull(),
    date: text('date').notNull(), // YYYY-MM-DD
    time: text('time').notNull(), // HH:mm
    tableId: integer('table_id').references(() => diningTables.id, { onDelete: 'set null' }),
    status: text('status', { enum: RESERVATION_STATUSES }).notNull().default('pending'),
    notes: text('notes'),
    preorderTotal: real('preorder_total').notNull().default(0),
    createdAt: createdAt()
  },
  (t) => [index('reservations_date').on(t.date)]
);

export const reservationItems = sqliteTable('reservation_items', {
  id: id(),
  reservationId: integer('reservation_id')
    .notNull()
    .references(() => reservations.id, { onDelete: 'cascade' }),
  menuItemId: integer('menu_item_id').notNull(),
  name: text('name').notNull(),
  price: real('price').notNull(),
  qty: real('qty').notNull()
});

export const aiUsage = sqliteTable('ai_usage', {
  id: id(),
  modelKey: text('model_key').notNull(),
  feature: text('feature').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costInr: real('cost_inr').notNull().default(0),
  ok: integer('ok', { mode: 'boolean' }).notNull().default(true),
  error: text('error'),
  createdAt: createdAt()
});

export const aiInsights = sqliteTable('ai_insights', {
  id: id(),
  period: text('period', { enum: ['weekly', 'monthly'] }).notNull(),
  modelKey: text('model_key').notNull(),
  forecast: text('forecast', { mode: 'json' }).notNull(),
  content: text('content').notNull(),
  createdAt: createdAt()
});

export const dayClosings = sqliteTable('day_closings', {
  id: id(),
  date: text('date').notNull().unique(),
  summary: text('summary', { mode: 'json' }).notNull(),
  createdAt: createdAt()
});

export type MenuItem = typeof menuItems.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type DailyStock = typeof dailyStock.$inferSelect;
