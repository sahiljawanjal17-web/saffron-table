import Link from 'next/link';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import POSTerminal from '@/features/orders/components/pos-terminal';
import { OrderStatusSelect } from '@/features/orders/components/order-status-select';
import { PaymentCell } from '@/features/orders/components/payment-cell';
import { releaseStaleOnlinePayments } from '@/server/payments';
import { getSetting } from '@/lib/settings';
import { formatMoney } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { listOrders } from '@/server/orders';
import { getStockForDate, today } from '@/server/stock';

export const metadata = { title: 'Dashboard: Orders & POS' };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ date: dateParam }, todayStr, business] = await Promise.all([searchParams, today(), getSetting('business')]);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayStr;
  await releaseStaleOnlinePayments();
  const [orders, stock] = await Promise.all([
    listOrders({ date }),
    getStockForDate(todayStr, { onlyDishes: true })
  ]);
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const active = orders.filter((o) => o.status !== 'cancelled');

  return (
    <PageContainer pageTitle='Orders & POS' pageDescription='Take counter orders from live stock and manage every order of the day.'>
      <Tabs defaultValue='pos'>
        <TabsList>
          <TabsTrigger value='pos'>POS terminal</TabsTrigger>
          <TabsTrigger value='orders'>Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value='pos' className='mt-4'>
          <POSTerminal stock={stock} currency={business.currency} locale={business.locale} taxPercent={business.taxPercent} />
        </TabsContent>

        <TabsContent value='orders' className='mt-4 space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader>
                <CardDescription>Revenue</CardDescription>
                <CardTitle className='text-3xl tabular-nums'>{money(active.reduce((s, o) => s + o.total, 0))}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Orders</CardDescription>
                <CardTitle className='text-3xl tabular-nums'>{active.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>In progress · unpaid {money(orders.filter((o) => o.status !== 'cancelled' && o.paymentStatus !== 'paid').reduce((s, o) => s + o.total, 0))}</CardDescription>
                <CardTitle className='text-3xl tabular-nums'>
                  {orders.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)).length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between gap-4'>
              <CardTitle>Orders on {date}</CardTitle>
              <form className='flex gap-2'>
                <Input type='date' name='date' defaultValue={date} className='w-40' />
                <Button type='submit' variant='outline'>
                  Show
                </Button>
              </form>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className='text-right'>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id} className={o.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell className='font-mono text-xs'>{o.code}</TableCell>
                      <TableCell className='whitespace-nowrap'>{formatDateTime(o.createdAt, business.timezone, business.locale).split(', ').pop()}</TableCell>
                      <TableCell>
                        {o.customerName}
                        {o.phone && <div className='text-muted-foreground text-xs'>{o.phone}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='capitalize'>
                          {o.type.replace('_', ' ')}
                        </Badge>
                        {o.source === 'online' && <Badge className='ml-1'>Online</Badge>}
                      </TableCell>
                      <TableCell>
                        <PaymentCell id={o.id} method={o.paymentMethod} status={o.paymentStatus} reference={o.paymentRef} cancelled={o.status === 'cancelled'} />
                      </TableCell>
                      <TableCell className='text-right tabular-nums'>{money(o.total)}</TableCell>
                      <TableCell>
                        <OrderStatusSelect id={o.id} status={o.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant='ghost' size='sm' nativeButton={false} render={<a href={`/api/orders/${o.code}/bill`} />}>
                          Bill
                        </Button>
                        <Button variant='ghost' size='sm' nativeButton={false} render={<Link href={`/order/${o.code}`} target='_blank' />}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!orders.length && (
                    <TableRow>
                      <TableCell colSpan={8} className='text-muted-foreground py-10 text-center'>
                        No orders on this date.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
