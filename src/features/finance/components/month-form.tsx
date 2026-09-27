'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveMonth } from '../actions';

const num = (v: FormDataEntryValue | null) => (v === null || v === '' ? null : Number(v));

export function MonthForm() {
  const [pending, start] = useTransition();
  return (
    <form
      className='grid gap-3 sm:grid-cols-5 sm:items-end'
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        start(async () => {
          try {
            await saveMonth({
              month: String(f.get('month')),
              revenue: num(f.get('revenue')),
              expenses: num(f.get('expenses')),
              note: (f.get('note') as string) || null
            });
            toast.success('Month saved');
            form.reset();
          } catch {
            toast.error('Could not save');
          }
        });
      }}
    >
      <div className='space-y-1.5'>
        <Label htmlFor='month'>Month</Label>
        <Input id='month' name='month' type='month' required />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='revenue'>Revenue (optional)</Label>
        <Input id='revenue' name='revenue' type='number' min={0} />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='expenses'>Expenses (optional)</Label>
        <Input id='expenses' name='expenses' type='number' min={0} />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='note'>Note</Label>
        <Input id='note' name='note' placeholder='Rent, supplies…' />
      </div>
      <Button type='submit' disabled={pending}>
        Save month
      </Button>
    </form>
  );
}
