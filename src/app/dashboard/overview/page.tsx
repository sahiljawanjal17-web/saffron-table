// Layout + stat cards from Kiranism starter app/dashboard/overview/layout.tsx (MIT), with real data.
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardFooter, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { AreaGraph } from '@/features/overview/components/area-graph';
import { BarGraph } from '@/features/overview/components/bar-graph';
import { PieGraph } from '@/features/overview/components/pie-graph';
import { RecentSales } from '@/features/overview/components/recent-sales';
import { getAllSettings } from '@/lib/settings';
import { formatMoney, formatQty, round2 } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { dailySeries, orderTypeMix, recentOrders, topItems, upcomingReservations } from '@/server/analytics';
import { buildDaySummary } from '@/server/reports';
import { today } from '@/server/stock';

export const metadata = { title: 'Dashboard: Overview' };

const pct = (a: number, b: number) => (b ? round2(((a - b) / b) * 100) : null);

export default async function OverviewPage() {
  const date = await today();
  const [{ brand, business }, summary, series, top, mix, recent, upcoming] = await Promise.all([
    getAllSettings(),
    buildDaySummary(date),
    dailySeries(60),
    topItems(30, 8),
    orderTypeMix(30),
    recentOrders(6),
    upcomingReservations(5)
  ]);
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const last30 = series.slice(-30);
  const prev30 = series.slice(0, 30);
  const rev30 = last30.reduce((s, d) => s + d.revenue, 0);
  const revPrev = prev30.reduce((s, d) => s + d.revenue, 0);
  const sameDayLastWeek = series[series.length - 8]?.revenue ?? 0;
  const todayChange = summary.totals.orders > 0 ? pct(summary.totals.revenue, sameDayLastWeek) : null;

  const cards = [
    {
      label: "Today's revenue",
      value: money(summary.totals.revenue),
      change: todayChange,
      foot: 'vs same day last week',
      sub: `${summary.totals.orders} orders · avg ${money(summary.totals.avgOrderValue)}`
    },
    {
      label: 'Last 30 days',
      value: money(rev30),
      change: pct(rev30, revPrev),
      foot: 'vs previous 30 days',
      sub: `${last30.reduce((s, d) => s + d.orders, 0)} orders`
    },
    {
      label: 'Open orders',
      value: String(summary.pendingOrders),
      change: null,
      foot: 'pending, preparing or ready',
      sub: `${summary.totals.cancelled} cancelled today`
    },
    {
      label: 'Guests booked today',
      value: String(summary.reservations.guests),
      change: null,
      foot: `${summary.reservations.total} reservations`,
      sub: `${summary.lowStock.length} items low on stock`
    }
  ];

  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h2 className='font-display text-3xl font-semibold tracking-tight'>Good day, {brand.name}</h2>
        </div>

        <div className='*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4'>
          {cards.map((c) => (
            <Card key={c.label} className='@container/card'>
              <CardHeader>
                <CardDescription>{c.label}</CardDescription>
                <CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>{c.value}</CardTitle>
                {c.change != null && (
                  <CardAction>
                    <Badge variant='outline'>
                      {c.change >= 0 ? <Icons.trendingUp /> : <Icons.trendingDown />}
                      {c.change >= 0 ? '+' : ''}
                      {c.change}%
                    </Badge>
                  </CardAction>
                )}
              </CardHeader>
              <CardFooter className='flex-col items-start gap-1.5 text-sm'>
                <div className='line-clamp-1 flex gap-2 font-medium'>{c.sub}</div>
                <div className='text-muted-foreground'>{c.foot}</div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4'>
            <AreaGraph chartData={last30.map((d) => ({ date: d.date, revenue: d.revenue }))} changePct={pct(rev30, revPrev)} />
          </div>
          <div className='col-span-4 md:col-span-3'>
            <RecentSales
              description={`${summary.totals.orders} orders so far today`}
              salesData={recent.map((o) => ({
                name: o.customerName,
                detail: `${o.code} · ${o.type.replace('_', ' ')} · ${formatDateTime(o.createdAt, business.timezone, business.locale)}`,
                amount: money(o.total)
              }))}
            />
          </div>
          <div className='col-span-4'>
            <BarGraph chartData={top.map((t) => ({ name: t.name, qty: t.qty }))} />
          </div>
          <div className='col-span-4 min-h-0 md:col-span-3'>
            <PieGraph data={mix.map((m) => ({ type: m.type, count: m.count }))} />
          </div>
          <Card className='col-span-4'>
            <CardHeader>
              <CardTitle>Low stock today</CardTitle>
              <CardDescription>At or below {business.lowStockThreshold} units</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-wrap gap-2'>
              {summary.lowStock.map((s) => (
                <Badge key={s.name} variant={s.remaining <= 0 ? 'destructive' : 'outline'}>
                  {s.name}: {formatQty(s.remaining)} {s.unit}
                </Badge>
              ))}
              {!summary.lowStock.length && <p className='text-muted-foreground text-sm'>All good.</p>}
            </CardContent>
          </Card>
          <Card className='col-span-4 md:col-span-3'>
            <CardHeader>
              <CardTitle>Upcoming reservations</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              {upcoming.map((r) => (
                <div key={r.id} className='flex justify-between'>
                  <span>
                    {r.name} · {r.partySize} guests
                  </span>
                  <span className='text-muted-foreground'>
                    {r.date} {r.time}
                  </span>
                </div>
              ))}
              {!upcoming.length && <p className='text-muted-foreground'>No upcoming bookings.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
