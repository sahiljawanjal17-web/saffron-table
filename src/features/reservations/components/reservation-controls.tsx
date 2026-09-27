'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RESERVATION_STATUSES } from '@/db/schema';
import { updateReservation } from '../actions';

type Status = (typeof RESERVATION_STATUSES)[number];

export function ReservationControls({
  id,
  status,
  tableId,
  tables
}: {
  id: number;
  status: Status;
  tableId: number | null;
  tables: { id: number; label: string; capacity: number }[];
}) {
  const [pending, start] = useTransition();
  const save = (patch: Parameters<typeof updateReservation>[1]) =>
    start(async () => {
      try {
        await updateReservation(id, patch);
        toast.success('Reservation updated');
      } catch {
        toast.error('Could not update');
      }
    });

  return (
    <div className='flex gap-2'>
      <NativeSelect size='sm' value={tableId ?? ''} disabled={pending} onChange={(e) => save({ tableId: e.target.value ? Number(e.target.value) : null })}>
        <NativeSelectOption value=''>No table</NativeSelectOption>
        {tables.map((t) => (
          <NativeSelectOption key={t.id} value={t.id}>
            {t.label} ({t.capacity})
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect size='sm' value={status} disabled={pending} onChange={(e) => save({ status: e.target.value as Status })}>
        {RESERVATION_STATUSES.map((s) => (
          <NativeSelectOption key={s} value={s}>
            {s}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
