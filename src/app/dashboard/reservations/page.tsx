import { and, asc, gte, inArray, lte } from 'drizzle-orm';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/db';
import { diningTables, reservationItems, reservations } from '@/db/schema';
import { ReservationControls } from '@/features/reservations/components/reservation-controls';
import { getSetting } from '@/lib/settings';
import { formatMoney, formatQty } from '@/lib/money';
import { addDays, prettyDate } from '@/lib/time';
import { today } from '@/server/stock';

export const metadata = { title: 'Dashboard: Reservations' };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [{ from: fromParam }, todayStr, business] = await Promise.all([searchParams, today(), getSetting('business')]);
  const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : todayStr;
  const to = addDays(from, 13);

  const [list, tables] = await Promise.all([
    db
      .select()
      .from(reservations)
      .where(and(gte(reservations.date, from), lte(reservations.date, to)))
      .orderBy(asc(reservations.date), asc(reservations.time)),
    db.select().from(diningTables).orderBy(asc(diningTables.label))
  ]);
  const items = list.length
    ? await db.select().from(reservationItems).where(inArray(reservationItems.reservationId, list.map((r) => r.id)))
    : [];
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const byDate = Map.groupBy(list, (r) => r.date);

  return (
    <PageContainer
      pageTitle='Reservations'
      pageDescription={`Bookings and pre-orders for the next two weeks (${prettyDate(from)} – ${prettyDate(to)}).`}
      pageHeaderAction={
        <form className='flex gap-2'>
          <Input type='date' name='from' defaultValue={from} className='w-40' />
          <Button type='submit' variant='outline'>
            Go
          </Button>
        </form>
      }
    >
      <div className='space-y-4'>
        {[...byDate.entries()].map(([date, rows]) => (
          <Card key={date}>
            <CardHeader className='flex flex-row items-center justify-between'>
              <CardTitle>{prettyDate(date)}</CardTitle>
              <Badge variant='outline'>
                {rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + r.partySize, 0)} guests
              </Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Notes / pre-order</TableHead>
                    <TableHead>Table & status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const pre = items.filter((i) => i.reservationId === r.id);
                    return (
                      <TableRow key={r.id} className={r.status === 'cancelled' ? 'opacity-50' : ''}>
                        <TableCell className='font-medium tabular-nums'>{r.time}</TableCell>
                        <TableCell>
                          {r.name}
                          <div className='text-muted-foreground text-xs'>
                            {r.phone} · <span className='font-mono'>{r.code}</span>
                          </div>
                        </TableCell>
                        <TableCell>{r.partySize}</TableCell>
                        <TableCell className='max-w-xs text-sm'>
                          {r.notes && <div>{r.notes}</div>}
                          {pre.length > 0 && (
                            <div className='text-muted-foreground'>
                              Pre-order: {pre.map((p) => `${p.name} × ${formatQty(p.qty)}`).join(', ')} ({money(r.preorderTotal)})
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ReservationControls id={r.id} status={r.status} tableId={r.tableId} tables={tables} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {!list.length && <p className='text-muted-foreground py-10 text-center'>No reservations in this period.</p>}
      </div>
    </PageContainer>
  );
}
