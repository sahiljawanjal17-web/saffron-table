'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { formatMoney, formatQty } from '@/lib/money';
import type { DaySummary } from '@/server/reports';
import { closeDayAction, generateSummaryAction } from '../actions';

export function EodPanel({ date, currency, locale }: { date: string; currency: string; locale: string }) {
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [pending, start] = useTransition();
  const money = (n: number) => formatMoney(n, currency, locale);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap gap-2'>
        <Button
          size='lg'
          disabled={pending}
          onClick={() =>
            start(async () => {
              setSummary(await generateSummaryAction(date));
            })
          }
        >
          <Icons.clipboard /> Generate report now
        </Button>
        <Button
          size='lg'
          variant='outline'
          disabled={pending}
          onClick={() =>
            start(async () => {
              const s = await closeDayAction(date);
              setSummary(s);
              toast.success('Day closed and saved to history');
            })
          }
        >
          <Icons.check /> Close day ({date})
        </Button>
        <Button size='lg' variant='ghost' nativeButton={false} render={<a href={`/api/admin/reports/eod?date=${date}`} />}>
          <Icons.download /> Download .txt
        </Button>
      </div>

      {summary && (
        <div className='grid gap-4 lg:grid-cols-3'>
          <Card>
            <CardHeader>
              <CardDescription>Total revenue</CardDescription>
              <CardTitle className='text-3xl tabular-nums'>{money(summary.totals.revenue)}</CardTitle>
            </CardHeader>
            <CardContent className='space-y-1 text-sm'>
              <Row l='Orders' r={summary.totals.orders} />
              <Row l='Cancelled' r={summary.totals.cancelled} />
              <Row l='Tax collected' r={money(summary.totals.tax)} />
              <Row l='Payments collected' r={money(summary.collected)} />
              <Row l='Outstanding (unpaid)' r={money(summary.outstanding)} />
              <Row l='Average order' r={money(summary.totals.avgOrderValue)} />
              <Row l='Items sold' r={formatQty(summary.totals.itemsSold)} />
              {summary.peakHour && <Row l='Peak hour' r={`${String(summary.peakHour.hour).padStart(2, '0')}:00`} />}
              <Row l='Still in progress' r={summary.pendingOrders} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Work done</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div>
                <p className='text-muted-foreground mb-1'>By type</p>
                {Object.entries(summary.byType).map(([k, v]) => (
                  <Row key={k} l={`${k.replace('_', ' ')} (${v.count})`} r={money(v.total)} />
                ))}
              </div>
              <div>
                <p className='text-muted-foreground mb-1'>Payments</p>
                {Object.entries(summary.byPayment).map(([k, v]) => (
                  <Row key={k} l={`${k.replace(/_/g, ' ')} (${v.count})`} r={money(v.total)} />
                ))}
              </div>
              <div>
                <p className='text-muted-foreground mb-1'>Reservations</p>
                <Row l='Bookings' r={summary.reservations.total} />
                <Row l='Guests' r={summary.reservations.guests} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Items sold</CardTitle>
            </CardHeader>
            <CardContent className='max-h-80 space-y-1 overflow-y-auto text-sm'>
              {summary.itemsSold.map((i) => (
                <Row key={i.name} l={`${i.name} × ${formatQty(i.qty)}`} r={money(i.revenue)} />
              ))}
              {!summary.itemsSold.length && <p className='text-muted-foreground'>No sales yet.</p>}
            </CardContent>
          </Card>
          <Card className='lg:col-span-3'>
            <CardHeader>
              <CardTitle>Inventory status</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              {summary.stock.map((s) => (
                <Badge key={s.name} variant={s.remaining <= 0 ? 'destructive' : 'outline'}>
                  {s.name}: {formatQty(s.sold)}/{formatQty(s.opening)} used · {formatQty(s.remaining)} {s.unit} left
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({ l, r }: { l: string; r: React.ReactNode }) {
  return (
    <div className='flex justify-between gap-4'>
      <span className='capitalize'>{l}</span>
      <span className='tabular-nums'>{r}</span>
    </div>
  );
}
