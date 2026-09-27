import { and, asc, eq } from 'drizzle-orm';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/db';
import { menuItems } from '@/db/schema';
import { StockTable } from '@/features/stock/components/stock-table';
import { getSetting } from '@/lib/settings';
import { prettyDate } from '@/lib/time';
import { getStockForDate, today } from '@/server/stock';

export const metadata = { title: 'Dashboard: Daily Stock' };

export default async function StockPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ date: dateParam }, todayStr, business] = await Promise.all([searchParams, today(), getSetting('business')]);
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayStr;
  const [rows, all] = await Promise.all([
    getStockForDate(date),
    db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        kind: menuItems.kind,
        unit: menuItems.unit,
        defaultDailyQty: menuItems.defaultDailyQty
      })
      .from(menuItems)
      .where(and(eq(menuItems.active, true)))
      .orderBy(asc(menuItems.kind), asc(menuItems.name))
  ]);
  const inDay = new Set(rows.map((r) => r.menuItemId));
  const available = all.filter((a) => !inDay.has(a.id));

  return (
    <PageContainer
      pageTitle='Daily Stock'
      pageDescription={`${prettyDate(date)} · Permanent items are filled in automatically. Customer orders reduce dish stock in real time.`}
      pageHeaderAction={
        <form className='flex gap-2'>
          <Input type='date' name='date' defaultValue={date} className='w-40' />
          <Button type='submit' variant='outline'>
            Go
          </Button>
        </form>
      }
    >
      <StockTable date={date} rows={rows} available={available} lowThreshold={business.lowStockThreshold} />
    </PageContainer>
  );
}
