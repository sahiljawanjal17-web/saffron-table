import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getAllSettings } from '@/lib/settings';
import { formatMoney, formatQty } from '@/lib/money';
import { formatDateTime } from '@/lib/time';
import { getOrderWithItems } from '@/server/orders';
import { Badge } from '@/components/ui/badge';
import { ONLINE_METHODS, METHOD_LABELS } from '@/lib/payment-methods';
import { confirmStripeSession, releaseStaleOnlinePayments } from '@/server/payments';
import { PayPanel } from '@/features/site/payments/pay-panel';

export const metadata = { title: 'Your order', robots: { index: false } };

const STEPS = ['pending', 'preparing', 'ready', 'completed'] as const;

export default async function OrderPage({
  params,
  searchParams
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ stripe_session?: string }>;
}) {
  const [{ code }, { stripe_session }] = await Promise.all([params, searchParams]);
  const orderCode = decodeURIComponent(code).toUpperCase();
  if (stripe_session) await confirmStripeSession(orderCode, stripe_session).catch(() => false);
  await releaseStaleOnlinePayments();
  const [order, { business }] = await Promise.all([
    getOrderWithItems({ code: orderCode }),
    getAllSettings()
  ]);
  if (!order) notFound();
  const money = (n: number) => formatMoney(n, business.currency, business.locale);
  const current = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const needsPayment =
    order.status !== 'cancelled' && ONLINE_METHODS.includes(order.paymentMethod) && order.paymentStatus !== 'paid';

  return (
    <section className='container max-w-3xl pt-32 pb-24'>
      <p className='eyebrow text-primary mb-3'>Order {order.code}</p>
      <h2 className='font-display font-medium mb-2'>
        {order.status === 'cancelled'
          ? 'This order was cancelled'
          : needsPayment
            ? 'Almost done, complete your payment.'
            : 'Thank you, your order is in.'}
      </h2>
      <p className='text-muted-foreground mb-10'>
        Placed {formatDateTime(order.createdAt, business.timezone, business.locale)} · {order.type.replace('_', ' ')} ·{' '}
        {METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}{' '}
        <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'} className='ml-1 align-middle capitalize'>
          {order.paymentStatus === 'awaiting' ? 'verifying' : order.paymentStatus}
        </Badge>
      </p>

      {needsPayment && (
        <PayPanel code={order.code} method={order.paymentMethod} status={order.paymentStatus} amountLabel={money(order.total)} />
      )}

      {order.status !== 'cancelled' && (
        <ol className='mb-12 grid grid-cols-4 gap-2'>
          {STEPS.map((s, i) => (
            <li key={s} className='text-center text-xs capitalize sm:text-sm'>
              <div className={`mb-2 h-1.5 rounded-full ${i <= current ? 'bg-primary' : 'bg-muted'}`} />
              {s}
            </li>
          ))}
        </ol>
      )}

      <div className='bg-card rounded-2xl border p-6'>
        {order.items.map((i) => (
          <div key={i.id} className='flex justify-between py-2 text-sm'>
            <span>
              {i.name} × {formatQty(i.qty)}
            </span>
            <span>{money(i.price * i.qty)}</span>
          </div>
        ))}
        <div className='mt-3 space-y-1 border-t pt-3 text-sm'>
          <div className='flex justify-between'>
            <span>Subtotal</span>
            <span>{money(order.subtotal)}</span>
          </div>
          <div className='text-muted-foreground flex justify-between'>
            <span>Tax</span>
            <span>{money(order.tax)}</span>
          </div>
          <div className='flex justify-between text-base font-semibold'>
            <span>Total</span>
            <span>{money(order.total)}</span>
          </div>
        </div>
      </div>

      <div className='mt-8 flex flex-wrap gap-3'>
        <Button variant='outline' nativeButton={false} render={<a href={`/api/orders/${order.code}/bill`} />}>
          Download bill (.txt)
        </Button>
        <Button variant='ghost' nativeButton={false} render={<Link href='/menu' />}>
          Order more
        </Button>
      </div>
    </section>
  );
}
