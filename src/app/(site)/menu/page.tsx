import MenuGrid from '@/features/site/components/MenuGrid';
import { getLiveMenu } from '@/server/stock';
import { releaseStaleOnlinePayments } from '@/server/payments';

export const metadata = { title: 'Order online' };

export default async function MenuPage() {
  await releaseStaleOnlinePayments();
  const { items } = await getLiveMenu();
  return <MenuGrid items={items} />;
}
