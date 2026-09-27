import Image from 'next/image';
import { asc, eq } from 'drizzle-orm';
import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db } from '@/db';
import { menuItems } from '@/db/schema';
import { MenuFormSheetTrigger } from '@/features/menu/components/menu-form-sheet';
import { CellAction } from '@/features/menu/components/cell-action';
import { getSetting } from '@/lib/settings';
import { formatMoney, formatQty } from '@/lib/money';

export const metadata = { title: 'Dashboard: Menu' };

export default async function MenuPage() {
  const [items, business] = await Promise.all([
    db.select().from(menuItems).where(eq(menuItems.active, true)).orderBy(asc(menuItems.kind), asc(menuItems.category), asc(menuItems.name)),
    getSetting('business')
  ]);

  return (
    <PageContainer
      pageTitle='Menu & Inventory Items'
      pageDescription='Dishes you sell and raw items you track. Mark fixed items as permanent.'
      pageHeaderAction={<MenuFormSheetTrigger />}
    >
      <div className='rounded-xl border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-16'>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className='text-right'>Price</TableHead>
              <TableHead className='text-right'>Daily qty</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className='w-12' />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt='' width={40} height={40} className='size-10 rounded-md object-cover' />
                  ) : (
                    <div className='bg-muted size-10 rounded-md' />
                  )}
                </TableCell>
                <TableCell className='font-medium'>{item.name}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>
                  <Badge variant='outline'>{item.kind === 'dish' ? 'Dish' : 'Raw'}</Badge>
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {item.kind === 'dish' ? formatMoney(item.price, business.currency, business.locale) : '—'}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {formatQty(item.defaultDailyQty)} {item.unit}
                </TableCell>
                <TableCell className='space-x-1'>
                  {item.isPermanent && <Badge variant='secondary'>Permanent</Badge>}
                  {item.isSignature && <Badge>Signature</Badge>}
                  {item.kind === 'dish' && <Badge variant='outline'>{item.isVeg ? 'Veg' : 'Non-veg'}</Badge>}
                </TableCell>
                <TableCell>
                  <CellAction data={item} />
                </TableCell>
              </TableRow>
            ))}
            {!items.length && (
              <TableRow>
                <TableCell colSpan={8} className='text-muted-foreground py-10 text-center'>
                  No items yet. Add your first dish.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}
