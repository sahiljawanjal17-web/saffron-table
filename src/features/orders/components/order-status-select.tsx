'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { ORDER_STATUSES } from '@/db/schema';
import { updateOrderStatus } from '../actions';

export function OrderStatusSelect({ id, status }: { id: number; status: (typeof ORDER_STATUSES)[number] }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      size='sm'
      value={status}
      disabled={pending || status === 'cancelled'}
      onChange={(e) => {
        const next = e.target.value as (typeof ORDER_STATUSES)[number];
        if (next === 'cancelled' && !window.confirm('Cancel this order and return its items to stock?')) return;
        start(async () => {
          try {
            await updateOrderStatus(id, next);
            toast.success(`Order marked ${next}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not update');
          }
        });
      }}
    >
      {ORDER_STATUSES.map((s) => (
        <NativeSelectOption key={s} value={s} className='capitalize'>
          {s}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
