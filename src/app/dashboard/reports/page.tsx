import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EodPanel } from '@/features/reports/components/eod-panel';
import { getSetting } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import { formatDateTime, prettyDate } from '@/lib/time';
import { listClosings, type DaySummary } from '@/server/reports';
import { today } from '@/server/stock';

export const metadata = { title: 'Dashboard: Reports' };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ date: dateParam }, todayStr, business, closings] = await Promise.all([
    searchParams,
    today(),
    getSetting('business'),
    listClosings(30)
  ]);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayStr;
  const money = (n: number) => formatMoney(n, business.currency, business.locale);

  return (
    <PageContainer
      pageTitle='Reports'
      pageDescription={`End of day or on-demand summary for ${prettyDate(date)}: sales, work done and inventory.`}
      pageHeaderAction={
        <form className='flex gap-2'>
          <Input type='date' name='date' defaultValue={date} className='w-40' />
          <Button type='submit' variant='outline'>
            Go
          </Button>
        </form>
      }
    >
      <div className='space-y-6'>
        <EodPanel key={date} date={date} currency={business.currency} locale={business.locale} />

        <Card>
          <CardHeader>
            <CardTitle>Closed days</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className='text-right'>Orders</TableHead>
                  <TableHead className='text-right'>Revenue</TableHead>
                  <TableHead>Closed at</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {closings.map((c) => {
                  const s = c.summary as DaySummary;
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{prettyDate(c.date)}</TableCell>
                      <TableCell className='text-right tabular-nums'>{s.totals.orders}</TableCell>
                      <TableCell className='text-right tabular-nums'>{money(s.totals.revenue)}</TableCell>
                      <TableCell>{formatDateTime(c.createdAt, business.timezone, business.locale)}</TableCell>
                      <TableCell>
                        <Button variant='ghost' size='sm' nativeButton={false} render={<a href={`/api/admin/reports/eod?date=${c.date}`} />}>
                          .txt
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!closings.length && (
                  <TableRow>
                    <TableCell colSpan={5} className='text-muted-foreground py-6 text-center'>
                      No days closed yet. Use “Close day” at the end of service.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
