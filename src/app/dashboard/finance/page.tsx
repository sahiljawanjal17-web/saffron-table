import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarGraph } from '@/features/overview/components/bar-graph';
import { MonthForm } from '@/features/finance/components/month-form';
import { getSetting } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import { monthlyFinance } from '@/server/analytics';

export const metadata = { title: 'Dashboard: Finance' };

export default async function FinancePage() {
  const [months, business] = await Promise.all([monthlyFinance(12), getSetting('business')]);
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const totals = months.reduce(
    (a, m) => ({ revenue: a.revenue + m.revenue, salaries: a.salaries + m.salaries, expenses: a.expenses + m.expenses, net: a.net + m.net }),
    { revenue: 0, salaries: 0, expenses: 0, net: 0 }
  );

  return (
    <PageContainer
      pageTitle='Finance'
      pageDescription='Revenue is calculated from orders automatically. For months before you started using the system, enter figures manually.'
    >
      <div className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-4'>
          {[
            ['12-month revenue', totals.revenue],
            ['Salaries paid', totals.salaries],
            ['Other expenses', totals.expenses],
            ['Net', totals.net]
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className='text-2xl tabular-nums'>{money(value as number)}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <BarGraph
          title='Monthly revenue'
          description='Last 12 months (orders + manual entries)'
          chartData={months.map((m) => ({ name: m.month, qty: Math.round(m.revenue) }))}
        />

        <Card>
          <CardHeader>
            <CardTitle>Add or correct a month</CardTitle>
            <CardDescription>Manual revenue is used only when there are no orders recorded for that month.</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Month by month</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className='text-right'>Revenue</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className='text-right'>Orders</TableHead>
                  <TableHead className='text-right'>Salaries</TableHead>
                  <TableHead className='text-right'>Expenses</TableHead>
                  <TableHead className='text-right'>Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {months
                  .slice()
                  .reverse()
                  .map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className='font-medium'>{m.month}</TableCell>
                      <TableCell className='text-right tabular-nums'>{money(m.revenue)}</TableCell>
                      <TableCell>
                        <Badge variant='outline'>{m.source}</Badge>
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>{m.orders || '—'}</TableCell>
                      <TableCell className='text-right tabular-nums'>{money(m.salaries)}</TableCell>
                      <TableCell className='text-right tabular-nums'>{money(m.expenses)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${m.net < 0 ? 'text-destructive' : ''}`}>{money(m.net)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  <TableCell className='text-right tabular-nums'>{money(totals.revenue)}</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className='text-right tabular-nums'>{money(totals.salaries)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{money(totals.expenses)}</TableCell>
                  <TableCell className='text-right tabular-nums'>{money(totals.net)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
