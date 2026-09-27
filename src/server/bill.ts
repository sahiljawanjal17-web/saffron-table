import { getAllSettings } from '@/lib/settings';
import { formatMoney, formatQty } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { METHOD_LABELS } from '@/lib/payment-methods';
import type { Order, OrderItem } from '@/db/schema';

const W = 40;
const center = (s: string) => {
  const t = s.slice(0, W);
  const left = Math.floor((W - t.length) / 2);
  return ' '.repeat(left) + t;
};
const row = (l: string, r: string) => {
  const space = W - r.length - 1;
  const left = l.length > space ? l.slice(0, space - 1) + '…' : l;
  return left.padEnd(space) + ' ' + r;
};

/** Plain-text receipt, sized for 40-column thermal printers. */
export async function orderBillText(order: Order & { items: OrderItem[] }) {
  const { brand, business } = await getAllSettings();
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const dash = '-'.repeat(W);
  const out: string[] = [];

  out.push(center(brand.name.toUpperCase()));
  if (brand.address) out.push(...wrap(brand.address).map(center));
  if (brand.phone) out.push(center(`Tel ${brand.phone}`));
  out.push(dash);
  out.push(row('Bill No', order.code));
  out.push(row('Date', formatDateTime(order.createdAt, business.timezone, business.locale)));
  out.push(row('Customer', order.customerName));
  if (order.phone) out.push(row('Phone', order.phone));
  out.push(row('Type', order.type.replace('_', ' ')));
  out.push(row('Payment', `${METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod} (${order.paymentStatus})`));
  if (order.address) out.push(...wrap(`Deliver to: ${order.address}`));
  out.push(dash);
  out.push(row('Item x Qty', 'Amount'));
  out.push(dash);
  for (const i of order.items) {
    out.push(row(`${i.name} x ${formatQty(i.qty)}`, money(i.price * i.qty)));
    out.push(`  @ ${money(i.price)}`);
  }
  out.push(dash);
  out.push(row('Subtotal', money(order.subtotal)));
  out.push(row(`Tax (${business.taxPercent}%)`, money(order.tax)));
  out.push(row('TOTAL', money(order.total)));
  out.push(dash);
  if (order.notes) out.push(...wrap(`Note: ${order.notes}`), dash);
  out.push(center('Thank you for dining with us'));
  out.push(center(brand.tagline));
  return out.join('\n') + '\n';
}

function wrap(text: string) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > W) {
      lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
