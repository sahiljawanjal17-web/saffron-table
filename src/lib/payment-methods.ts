import type { PaymentMethod } from '@/db/schema';
import type { PaymentSettings } from '@/lib/settings';

// ---------------------------------------------------------------------------
// Configuration — secrets only from env, toggles from Settings
// ---------------------------------------------------------------------------

/** Server-only: gateway secrets from env vars. */
export const paymentEnv = {
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  stripeSecret: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET
};

export const gatewayConfigured = {
  razorpay: () => Boolean(paymentEnv.razorpayKeyId && paymentEnv.razorpayKeySecret),
  stripe: () => Boolean(paymentEnv.stripeSecret)
};

export type MethodOption = {
  value: PaymentMethod;
  label: string;
  description: string;
  online: boolean; // needs payment before the kitchen starts
};

/** Methods a customer can choose at checkout, filtered by settings + configured keys + order type. */
export function customerMethods(p: PaymentSettings, orderType: string): MethodOption[] {
  const list: MethodOption[] = [];
  if (p.razorpay && gatewayConfigured.razorpay())
    list.push({ value: 'razorpay', label: 'UPI, cards, netbanking & wallets', description: 'Secure payment via Razorpay', online: true });
  if (p.upiQr && p.upiId)
    list.push({ value: 'upi_qr', label: 'Scan UPI QR', description: `Pay ${p.upiPayeeName} from any UPI app`, online: true });
  if (p.stripe && gatewayConfigured.stripe())
    list.push({ value: 'stripe', label: 'International card / Apple Pay / Google Pay', description: 'Secure payment via Stripe', online: true });
  if (orderType === 'delivery') {
    if (p.cash) list.push({ value: 'cash', label: 'Cash on delivery', description: 'Pay the rider in cash', online: false });
    if (p.cardOnDelivery) list.push({ value: 'card_on_delivery', label: 'Card / UPI on delivery', description: 'Rider carries a card machine', online: false });
  } else if (p.payOnCollection) {
    list.push({
      value: 'pay_on_collection',
      label: orderType === 'dine_in' ? 'Pay at the table' : 'Pay at pick-up',
      description: 'Cash, card or UPI at the counter',
      online: false
    });
  }
  return list;
}

export const COUNTER_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'upi_qr', label: 'UPI QR (verify)' }
];

export const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
  card_on_delivery: 'Card on delivery',
  pay_on_collection: 'Pay at counter',
  upi_qr: 'UPI QR',
  razorpay: 'Razorpay',
  stripe: 'Stripe'
};

export const ONLINE_METHODS: string[] = ['razorpay', 'stripe', 'upi_qr'];
