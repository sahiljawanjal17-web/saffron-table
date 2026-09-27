'use client';

import { Icon } from '@iconify/react';
import { cn } from '@/lib/utils';
import type { MethodOption } from '@/lib/payment-methods';

const ICONS: Record<string, string> = {
  razorpay: 'solar:card-transfer-bold',
  upi_qr: 'solar:qr-code-bold',
  stripe: 'solar:card-bold',
  cash: 'solar:wallet-money-bold',
  card_on_delivery: 'solar:card-send-bold',
  pay_on_collection: 'solar:shop-bold'
};

export function PaymentOptions({
  methods,
  value,
  onChange
}: {
  methods: MethodOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (!methods.length) {
    return <p className='text-destructive text-sm'>No payment method is available for this order type right now.</p>;
  }
  return (
    <div className='grid gap-3 sm:grid-cols-2' role='radiogroup' aria-label='Payment method'>
      {methods.map((m) => (
        <button
          key={m.value}
          type='button'
          role='radio'
          aria-checked={value === m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-4 text-left transition',
            value === m.value ? 'border-primary bg-primary/5 ring-primary ring-1' : 'hover:border-primary/50'
          )}
        >
          <Icon icon={ICONS[m.value] ?? 'solar:wallet-bold'} className='text-primary mt-0.5 size-6 shrink-0' />
          <span>
            <span className='block font-medium'>{m.label}</span>
            <span className='text-muted-foreground block text-sm'>{m.description}</span>
            {m.online && <span className='text-primary mt-1 block text-xs font-medium'>Pay now</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
