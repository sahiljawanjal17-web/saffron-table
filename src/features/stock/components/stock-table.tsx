'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { formatQty } from '@/lib/money';
import type { StockRow } from '@/server/stock';
import { addToDayAction, adjustAction, removeFromDayAction, setOpeningAction } from '../actions';

type Option = { id: number; name: string; kind: string; unit: string; defaultDailyQty: number };

export function StockTable({
  date,
  rows,
  available,
  lowThreshold
}: {
  date: string;
  rows: StockRow[];
  available: Option[];
  lowThreshold: number;
}) {
  const [pending, start] = useTransition();
  const [addId, setAddId] = useState('');
  const [addQty, setAddQty] = useState('');

  const run = (fn: () => Promise<void>, ok: string) =>
    start(async () => {
      try {
        await fn();
        toast.success(ok);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed');
      }
    });

  const section = (kind: 'dish' | 'raw', title: string) => {
    const list = rows.filter((r) => r.kind === kind);
    return (
      <div className='rounded-xl border'>
        <div className='flex items-center justify-between border-b px-4 py-3'>
          <p className='font-medium'>{title}</p>
          <span className='text-muted-foreground text-sm'>{list.length} items</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className='w-32'>Opening qty</TableHead>
              <TableHead className='text-right'>Adjust</TableHead>
              <TableHead className='text-right'>Sold / used</TableHead>
              <TableHead className='text-right'>Remaining</TableHead>
              <TableHead className='w-40' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.stockId}>
                <TableCell>
                  <div className='font-medium'>{r.name}</div>
                  <div className='text-muted-foreground text-xs'>
                    {r.category}
                    {r.isPermanent && ' · permanent'}
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type='number'
                    min={0}
                    step='0.5'
                    defaultValue={r.openingQty}
                    className='h-8 w-24'
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== r.openingQty) run(() => setOpeningAction(r.stockId, v), `${r.name} set to ${v}`);
                    }}
                  />
                </TableCell>
                <TableCell className='text-right tabular-nums'>{r.adjustQty ? formatQty(r.adjustQty) : '—'}</TableCell>
                <TableCell className='text-right tabular-nums'>{formatQty(r.soldQty)}</TableCell>
                <TableCell className='text-right'>
                  <Badge variant={r.remaining <= 0 ? 'destructive' : r.remaining <= lowThreshold ? 'outline' : 'secondary'}>
                    {formatQty(r.remaining)} {r.unit}
                  </Badge>
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
                    <Button size='icon-sm' variant='outline' disabled={pending} title='Remove 1 (waste / used)' onClick={() => run(() => adjustAction(r.stockId, -1), `${r.name} −1`)}>
                      <Icons.minus />
                    </Button>
                    <Button size='icon-sm' variant='outline' disabled={pending} title='Add 1' onClick={() => run(() => adjustAction(r.stockId, 1), `${r.name} +1`)}>
                      <Icons.plus />
                    </Button>
                    {r.soldQty === 0 && (
                      <Button size='icon-sm' variant='ghost' disabled={pending} title='Remove from today' onClick={() => run(() => removeFromDayAction(r.stockId), `${r.name} removed`)}>
                        <Icons.trash />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!list.length && (
              <TableRow>
                <TableCell colSpan={6} className='text-muted-foreground py-6 text-center'>
                  Nothing added for this day.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className='space-y-4'>
      <div className='bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4'>
        <div className='min-w-60 flex-1 space-y-1.5'>
          <p className='text-sm font-medium'>Add item to {date}</p>
          <NativeSelect
            value={addId}
            className='w-full'
            onChange={(e) => {
              setAddId(e.target.value);
              const opt = available.find((a) => String(a.id) === e.target.value);
              if (opt) setAddQty(String(opt.defaultDailyQty || ''));
            }}
          >
            <NativeSelectOption value=''>Choose a dish or raw item…</NativeSelectOption>
            {available.map((a) => (
              <NativeSelectOption key={a.id} value={a.id}>
                {a.name} ({a.kind === 'dish' ? 'dish' : a.unit})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className='space-y-1.5'>
          <p className='text-sm font-medium'>Quantity</p>
          <Input type='number' min={0} step='0.5' value={addQty} onChange={(e) => setAddQty(e.target.value)} className='w-28' />
        </div>
        <Button
          disabled={!addId || addQty === '' || pending}
          onClick={() =>
            run(async () => {
              await addToDayAction(date, Number(addId), Number(addQty));
              setAddId('');
              setAddQty('');
            }, 'Added to stock')
          }
        >
          <Icons.add /> Add
        </Button>
      </div>
      {section('dish', 'Dishes (sold to customers — auto-deducted on every order)')}
      {section('raw', 'Raw inventory (vegetables, meat, rice…)')}
    </div>
  );
}
