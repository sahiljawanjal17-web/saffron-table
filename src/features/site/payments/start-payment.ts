'use client';

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay'));
    document.body.appendChild(s);
  });
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Payment error');
  return data as T;
}

/** Opens Razorpay Checkout. Resolves true when paid & verified, false if the customer closed it. */
export async function payWithRazorpay(code: string, themeColor: string): Promise<boolean> {
  await loadRazorpay();
  const o = await post<{
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    prefill: { name: string; contact: string };
  }>('/api/payments/razorpay/order', { code });

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: o.keyId,
      amount: o.amount,
      currency: o.currency,
      name: o.name,
      description: o.description,
      order_id: o.razorpayOrderId,
      prefill: o.prefill,
      theme: { color: themeColor },
      handler: async (r: RazorpayResponse) => {
        try {
          await post('/api/payments/razorpay/verify', { code, ...r });
          resolve(true);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(false) }
    });
    rzp.open();
  });
}

/** Redirects to Stripe hosted Checkout. */
export async function payWithStripe(code: string) {
  const { url } = await post<{ url: string }>('/api/payments/stripe/session', { code });
  window.location.href = url;
}

export function brandPrimaryColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#9a6b2c';
}
