'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/features/site/cart/cart-context';
import { cn } from '@/lib/utils';
import type { MethodOption } from '@/lib/payment-methods';
import { PaymentOptions } from '@/features/site/payments/payment-options';
import { brandPrimaryColor, payWithRazorpay, payWithStripe } from '@/features/site/payments/start-payment';

const TYPES = [
  { value: 'takeaway', label: 'Pick up' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'dine_in', label: 'Dine in' }
] as const;

export function CheckoutForm({ methodsByType }: { methodsByType: Record<string, MethodOption[]> }) {
  const { lines, subtotal, taxPercent, money, clear } = useCart();
  const router = useRouter();
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('takeaway');
  const [pending, setPending] = useState(false);
  const methods = methodsByType[type] ?? [];
  const [method, setMethod] = useState('');
  const selected = methods.find((m) => m.value === method) ?? methods[0];
  const tax = (subtotal * taxPercent) / 100;

  if (!lines.length) {
    return (
      <div>
        <p className='text-muted-foreground'>Your order is empty.</p>
        <Button className='mt-4' nativeButton={false} render={<Link href='/menu' />}>
          Browse today&apos;s menu
        </Button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setPending(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: f.get('name'),
          phone: f.get('phone'),
          address: f.get('address') ?? '',
          notes: f.get('notes'),
          type,
          paymentMethod: selected?.value,
          items: lines.map((l) => ({ menuItemId: l.menuItemId, qty: l.qty }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not place order');
      clear();
      if (selected?.value === 'razorpay') {
        try {
          const paid = await payWithRazorpay(data.code, brandPrimaryColor());
          toast[paid ? 'success' : 'info'](paid ? 'Payment successful' : 'Payment not completed — you can retry from the order page');
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Payment failed');
        }
        router.push(`/order/${data.code}`);
        return;
      }
      if (selected?.value === 'stripe') {
        await payWithStripe(data.code);
        return;
      }
      router.push(`/order/${data.code}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not place order');
      setPending(false);
    }
  }

  return (
    <div className='grid gap-12 lg:grid-cols-5'>
      <form onSubmit={onSubmit} className='space-y-6 lg:col-span-3'>
        <div className='flex flex-wrap gap-2'>
          {TYPES.map((t) => (
            <button
              key={t.value}
              type='button'
              onClick={() => setType(t.value)}
              className={cn(
                'rounded-full border px-5 py-2 text-sm font-medium transition',
                type === t.value ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary'
              )}>
              {t.label}
            </button>
          ))}
        </div>
        <div className='grid gap-6 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Name</Label>
            <Input id='name' name='name' required className='h-11' />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone</Label>
            <Input id='phone' name='phone' type='tel' required className='h-11' />
          </div>
        </div>
        {type === 'delivery' && (
          <div className='space-y-2'>
            <Label htmlFor='address'>Delivery address</Label>
            <Textarea id='address' name='address' required rows={3} />
          </div>
        )}
        <div className='space-y-2'>
          <Label htmlFor='notes'>Notes for the kitchen</Label>
          <Textarea id='notes' name='notes' rows={2} placeholder='Less spicy, no onion, allergies' />
        </div>
        <div className='space-y-3'>
          <Label>Payment</Label>
          <PaymentOptions methods={methods} value={selected?.value ?? ''} onChange={setMethod} />
        </div>
        <Button type='submit' disabled={pending || !selected} className='h-12 w-full sm:w-auto sm:px-10'>
          {pending
            ? 'Processing...'
            : selected?.online
              ? `Pay ${money(subtotal + tax)}`
              : `Place order · ${money(subtotal + tax)}`}
        </Button>
      </form>

      <aside className='bg-card h-fit rounded-2xl border p-6 lg:col-span-2'>
        <p className='font-display mb-4 text-2xl'>Summary</p>
        <div className='space-y-3 text-sm'>
          {lines.map((l) => (
            <div key={l.menuItemId} className='flex justify-between gap-4'>
              <span>
                {l.name} × {l.qty}
              </span>
              <span className='tabular-nums'>{money(l.price * l.qty)}</span>
            </div>
          ))}
          <div className='border-t pt-3 flex justify-between'>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className='text-muted-foreground flex justify-between'>
            <span>Tax ({taxPercent}%)</span>
            <span>{money(tax)}</span>
          </div>
          <div className='flex justify-between text-base font-semibold'>
            <span>Total</span>
            <span>{money(subtotal + tax)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
