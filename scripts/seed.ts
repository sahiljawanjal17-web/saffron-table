/**
 * Demo data: menu, raw inventory, staff, tables, 90 days of realistic order history
 * (weekday seasonality + gentle trend) so charts and AI forecasts have something to learn.
 *
 *   npm run db:seed            -> seeds only if the menu is empty
 *   npm run db:seed -- --reset -> wipes all tables first
 */
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as s from '../src/db/schema';

const url = process.env.DATABASE_URL || 'file:data/app.db';
const db = drizzle(createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN }), { schema: s });

const TZ = 'Asia/Kolkata';
const TAX = 5;
const reset = process.argv.includes('--reset');

// Deterministic PRNG so every seed looks the same
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;

const ymd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

type Dish = {
  name: string;
  description: string;
  category: string;
  price: number;
  img: string;
  veg: boolean;
  permanent: boolean;
  signature?: boolean;
  qty: number;
  popularity: number;
};

const dishes: Dish[] = [
  { name: 'Old Delhi Butter Chicken', description: 'Charred tandoori chicken folded into a velvet tomato, butter and fenugreek sauce.', category: 'Mains', price: 520, img: 'butter-chicken', veg: false, permanent: true, signature: true, qty: 40, popularity: 1.0 },
  { name: 'Paneer Makhani', description: 'House-made paneer in a slow-simmered cashew and tomato gravy.', category: 'Mains', price: 440, img: 'paneer-makhani', veg: true, permanent: true, qty: 32, popularity: 0.8 },
  { name: 'Dal Makhani', description: 'Black lentils cooked overnight on the tandoor embers with cream and butter.', category: 'Mains', price: 380, img: 'dal-makhani', veg: true, permanent: true, signature: true, qty: 45, popularity: 0.9 },
  { name: 'Kashmiri Rogan Josh', description: 'Tender mutton braised with Kashmiri chilli, fennel and dried ginger.', category: 'Mains', price: 640, img: 'rogan-josh', veg: false, permanent: true, qty: 22, popularity: 0.55 },
  { name: 'Chicken Chettinad', description: 'Fiery Karaikudi-style curry with freshly roasted black pepper and kalpasi.', category: 'Mains', price: 540, img: 'chicken-chettinad', veg: false, permanent: false, qty: 18, popularity: 0.45 },
  { name: 'Kerala Fish Curry', description: 'Seer fish in a tangy kokum and coconut milk curry.', category: 'Mains', price: 620, img: 'kerala-fish-curry', veg: false, permanent: false, qty: 16, popularity: 0.4 },
  { name: 'Hyderabadi Dum Biryani', description: 'Aged basmati and marinated chicken sealed and slow-cooked in dum.', category: 'Biryani & Rice', price: 560, img: 'hyderabadi-biryani', veg: false, permanent: true, signature: true, qty: 40, popularity: 0.95 },
  { name: 'Lucknowi Mutton Biryani', description: 'Fragrant awadhi biryani layered with saffron, kewra and tender mutton.', category: 'Biryani & Rice', price: 680, img: 'mutton-biryani', veg: false, permanent: true, qty: 24, popularity: 0.6 },
  { name: 'Subz Dum Biryani', description: 'Seasonal vegetables, fried onions and mint layered with long-grain basmati.', category: 'Biryani & Rice', price: 420, img: 'veg-dum-biryani', veg: true, permanent: true, qty: 26, popularity: 0.5 },
  { name: 'Kabuli Pulao', description: 'Afghani rice with caramelised carrots, raisins and slow-cooked lamb.', category: 'Biryani & Rice', price: 590, img: 'kabuli-pulao', veg: false, permanent: false, qty: 12, popularity: 0.3 },
  { name: 'Tandoori Chicken', description: 'Half chicken marinated for 24 hours in yoghurt and spices, finished in the clay oven.', category: 'From the Tandoor', price: 480, img: 'tandoori-chicken', veg: false, permanent: true, qty: 30, popularity: 0.75 },
  { name: 'Chicken Tikka', description: 'Boneless thigh tikka with smoked chilli and mustard oil.', category: 'From the Tandoor', price: 460, img: 'chicken-tikka', veg: false, permanent: true, qty: 30, popularity: 0.7 },
  { name: 'Paneer Tikka Sizzler', description: 'Ajwain-spiced paneer, peppers and onions on a cast-iron sizzler.', category: 'From the Tandoor', price: 420, img: 'paneer-tikka', veg: true, permanent: true, qty: 28, popularity: 0.65 },
  { name: 'Mixed Grill Platter', description: 'A chef’s selection of kebabs, tikka and grilled vegetables for two.', category: 'From the Tandoor', price: 1180, img: 'grill-platter', veg: false, permanent: false, signature: true, qty: 10, popularity: 0.25 },
  { name: 'Royal Thali', description: 'A complete meal — two curries, dal, rice, breads, raita and dessert.', category: 'Thalis', price: 690, img: 'royal-thali', veg: true, permanent: true, signature: true, qty: 25, popularity: 0.6 },
  { name: 'Amritsari Samosa', description: 'Crisp hand-folded pastry with spiced potato and peas, tamarind chutney.', category: 'Small Plates', price: 180, img: 'samosa', veg: true, permanent: true, qty: 60, popularity: 0.85 },
  { name: 'Mumbai Pav Bhaji', description: 'Buttery mashed vegetable bhaji with toasted pav and pickled onion.', category: 'Small Plates', price: 260, img: 'pav-bhaji', veg: true, permanent: true, qty: 35, popularity: 0.55 },
  { name: 'Idli Vada Sambar', description: 'Steamed rice cakes and crisp lentil vada with sambar and two chutneys.', category: 'Small Plates', price: 220, img: 'idli-vada', veg: true, permanent: false, qty: 30, popularity: 0.45 },
  { name: 'Garden Harvest Bowl', description: 'Roasted chickpeas, seasonal greens, avocado and a lemon-coriander dressing.', category: 'Small Plates', price: 340, img: 'garden-bowl', veg: true, permanent: false, qty: 15, popularity: 0.25 },
  { name: 'Masala Chai', description: 'Assam tea brewed with milk, cardamom, ginger and cinnamon.', category: 'Drinks', price: 120, img: 'masala-chai', veg: true, permanent: true, qty: 80, popularity: 0.9 }
];

const rawItems = [
  { name: 'Onions', unit: 'kg', qty: 25 },
  { name: 'Tomatoes', unit: 'kg', qty: 20 },
  { name: 'Paneer', unit: 'kg', qty: 8 },
  { name: 'Chicken', unit: 'kg', qty: 30 },
  { name: 'Mutton', unit: 'kg', qty: 12 },
  { name: 'Basmati Rice', unit: 'kg', qty: 20 },
  { name: 'Coriander', unit: 'bunch', qty: 30 },
  { name: 'Green Chillies', unit: 'kg', qty: 3 }
];

const staffSeed = [
  { name: 'Arjun Mehta', role: 'Head Chef', phone: '+91 98200 11223', salary: 85000, joinDate: '2021-03-01' },
  { name: 'Farah Khan', role: 'Sous Chef', phone: '+91 98200 44556', salary: 52000, joinDate: '2022-06-15' },
  { name: 'Ravi Kumar', role: 'Tandoor Chef', phone: '+91 98200 77889', salary: 38000, joinDate: '2022-01-10' },
  { name: 'Neha Sharma', role: 'Restaurant Manager', phone: '+91 98200 99001', salary: 65000, joinDate: '2021-08-01' },
  { name: 'Joseph D’Souza', role: 'Captain', phone: '+91 98200 22334', salary: 32000, joinDate: '2023-02-20' },
  { name: 'Priya Nair', role: 'Server', phone: null, salary: 24000, joinDate: '2024-04-05' },
  { name: 'Imran Shaikh', role: 'Delivery', phone: '+91 98200 55667', salary: null, joinDate: null }
];

const names = ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Rohan', 'Isha', 'Vivaan', 'Meera', 'Sameer', 'Zoya', 'Karan', 'Tara', 'Nikhil', 'Sara', 'Aditya', 'Riya'];
const surnames = ['Kapoor', 'Iyer', 'Singh', 'Desai', 'Rao', 'Malhotra', 'Bose', 'Pillai', 'Gupta', 'Fernandes'];

async function main() {
  const existing = await db.select({ id: s.menuItems.id }).from(s.menuItems).limit(1);
  if (existing.length && !reset) {
    console.log('Database already has data. Use --reset to wipe and reseed.');
    return;
  }
  if (reset) {
    for (const t of [s.orderItems, s.orders, s.reservationItems, s.reservations, s.dailyStock, s.salaryPayments, s.staff, s.menuItems, s.diningTables, s.monthlyRevenue, s.dayClosings, s.aiInsights, s.settings]) {
      await db.delete(t);
    }
    console.log('Cleared existing data');
  }

  const menu = await db
    .insert(s.menuItems)
    .values([
      ...dishes.map((d) => ({
        name: d.name,
        description: d.description,
        category: d.category,
        kind: 'dish' as const,
        price: d.price,
        unit: 'plate',
        imageUrl: `/media/dishes/${d.img}.jpg`,
        isVeg: d.veg,
        isPermanent: d.permanent,
        isSignature: Boolean(d.signature),
        defaultDailyQty: d.qty
      })),
      ...rawItems.map((r) => ({
        name: r.name,
        category: 'Raw Inventory',
        kind: 'raw' as const,
        price: 0,
        unit: r.unit,
        isVeg: true,
        isPermanent: true,
        defaultDailyQty: r.qty
      }))
    ])
    .returning();

  const dishRows = menu.filter((m) => m.kind === 'dish');
  const popularity = new Map(dishes.map((d) => [d.name, d.popularity]));

  const staffRows = await db.insert(s.staff).values(staffSeed).returning();
  await db.insert(s.diningTables).values(
    [2, 2, 4, 4, 4, 6, 6, 8].map((capacity, i) => ({ label: `T${i + 1}`, capacity }))
  );

  const todayStr = ymd(new Date());
  const DAYS = 90;
  const weekdayFactor = [1.35, 0.8, 0.85, 0.9, 1.0, 1.3, 1.5]; // Sun..Sat
  let orderCount = 0;

  for (let back = DAYS; back >= 1; back--) {
    const date = addDays(todayStr, -back);
    const wd = new Date(`${date}T00:00:00Z`).getUTCDay();
    const trend = 1 + ((DAYS - back) / DAYS) * 0.18; // ~18% growth over the quarter
    const ordersToday = Math.round((26 + rand() * 8) * weekdayFactor[wd] * trend);

    const sold = new Map<number, number>();
    const orderValues: (typeof s.orders.$inferInsert)[] = [];
    const lineValues: { code: string; lines: { item: (typeof dishRows)[number]; qty: number }[] }[] = [];

    for (let o = 0; o < ordersToday; o++) {
      const lineCount = 1 + Math.floor(rand() * 4);
      const lines: { item: (typeof dishRows)[number]; qty: number }[] = [];
      for (let l = 0; l < lineCount; l++) {
        // popularity-weighted pick
        const total = dishRows.reduce((a, d) => a + (popularity.get(d.name) ?? 0.3), 0);
        let r = rand() * total;
        let item = dishRows[0];
        for (const d of dishRows) {
          r -= popularity.get(d.name) ?? 0.3;
          if (r <= 0) {
            item = d;
            break;
          }
        }
        const qty = item.category === 'Drinks' ? 1 + Math.floor(rand() * 3) : 1 + (rand() < 0.2 ? 1 : 0);
        lines.push({ item, qty });
        sold.set(item.id, (sold.get(item.id) ?? 0) + qty);
      }
      const subtotal = round2(lines.reduce((a, l) => a + l.item.price * l.qty, 0));
      const tax = round2((subtotal * TAX) / 100);
      const lunch = rand() < 0.4;
      const hour = lunch ? 12 + Math.floor(rand() * 3) : 19 + Math.floor(rand() * 4);
      const utc = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00+05:30`);
      const type = pick(['dine_in', 'dine_in', 'dine_in', 'takeaway', 'delivery', 'online'] as const);
      const cancelled = rand() < 0.03;
      const code = `OR-H${date.replace(/-/g, '').slice(2)}${String(o).padStart(3, '0')}`;
      orderValues.push({
        code,
        customerName: `${pick(names)} ${pick(surnames)}`,
        phone: `+91 9${Math.floor(100000000 + rand() * 899999999)}`,
        type,
        source: type === 'online' ? 'online' : 'counter',
        status: cancelled ? 'cancelled' : 'completed',
        paymentMethod: type === 'online' ? pick(['razorpay', 'upi_qr']) : pick(['cash', 'card', 'upi', 'upi']),
        paymentStatus: cancelled ? 'refunded' : 'paid',
        paidAt: cancelled ? null : utc.toISOString(),
        subtotal,
        tax,
        total: round2(subtotal + tax),
        businessDate: date,
        createdAt: utc.toISOString()
      });
      lineValues.push({ code, lines });
    }

    const inserted = await db.insert(s.orders).values(orderValues).returning({ id: s.orders.id, code: s.orders.code });
    const idByCode = new Map(inserted.map((r) => [r.code, r.id]));
    await db.insert(s.orderItems).values(
      lineValues.flatMap((lv) =>
        lv.lines.map((l) => ({
          orderId: idByCode.get(lv.code)!,
          menuItemId: l.item.id,
          name: l.item.name,
          price: l.item.price,
          qty: l.qty
        }))
      )
    );

    // Stock rows for history (only last 14 days to keep the table small)
    if (back <= 14) {
      await db.insert(s.dailyStock).values(
        menu
          .filter((m) => m.isPermanent || sold.has(m.id))
          .map((m) => {
            const soldQty = m.kind === 'dish' ? (sold.get(m.id) ?? 0) : Math.round(m.defaultDailyQty * (0.6 + rand() * 0.35));
            return {
              date,
              menuItemId: m.id,
              openingQty: Math.max(m.defaultDailyQty, soldQty),
              soldQty
            };
          })
      );
    }
    orderCount += ordersToday;
  }

  // Today: permanent items + a couple of daily specials, a few live orders
  await db.insert(s.dailyStock).values(
    menu
      .filter((m) => m.isPermanent || ['Chicken Chettinad', 'Mixed Grill Platter'].includes(m.name))
      .map((m) => ({ date: todayStr, menuItemId: m.id, openingQty: m.defaultDailyQty }))
  );

  // Manual revenue for the 6 months before the system existed
  const months: { month: string; revenue: number; expenses: number }[] = [];
  const base = new Date(`${addDays(todayStr, -DAYS).slice(0, 7)}-01T00:00:00Z`);
  for (let i = 6; i >= 1; i--) {
    const m = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 1));
    months.push({
      month: m.toISOString().slice(0, 7),
      revenue: Math.round(780000 + rand() * 180000),
      expenses: Math.round(210000 + rand() * 40000)
    });
  }
  await db.insert(s.monthlyRevenue).values(months.map((m) => ({ ...m, note: 'Imported from previous POS' })));

  // Salary payments for last 3 months
  const salaryValues = [];
  for (let i = 3; i >= 1; i--) {
    const m = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - i, 1));
    const month = m.toISOString().slice(0, 7);
    for (const st of staffRows) {
      if (st.salary) salaryValues.push({ staffId: st.id, month, amount: st.salary, paidOn: `${month}-28` });
    }
  }
  if (salaryValues.length) await db.insert(s.salaryPayments).values(salaryValues);

  // Upcoming reservations
  const resv = [
    { name: 'Meera Iyer', phone: '+91 98111 22334', partySize: 4, date: todayStr, time: '20:00', status: 'confirmed' as const },
    { name: 'Rahul Bose', phone: '+91 98111 55667', partySize: 2, date: todayStr, time: '21:15', status: 'pending' as const },
    { name: 'Kapoor Family', phone: '+91 98111 88990', partySize: 8, date: addDays(todayStr, 1), time: '13:00', status: 'confirmed' as const, notes: 'Anniversary — cake at 14:00' },
    { name: 'Tara Fernandes', phone: '+91 98111 00112', partySize: 3, date: addDays(todayStr, 2), time: '19:30', status: 'pending' as const }
  ];
  let rc = 0;
  for (const r of resv) {
    await db.insert(s.reservations).values({ ...r, code: `RS-DEMO${++rc}` });
  }

  console.log(`Seeded ${dishRows.length} dishes, ${rawItems.length} raw items, ${staffRows.length} staff, ${orderCount} historical orders.`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
