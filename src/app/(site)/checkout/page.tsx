import { getSetting } from '@/lib/settings';
import { customerMethods } from '@/lib/payment-methods';
import { CheckoutForm } from './checkout-form';

export const metadata = { title: 'Checkout' };

export default async function CheckoutPage() {
  const [business, payments] = await Promise.all([getSetting('business'), getSetting('payments')]);
  const methodsByType = Object.fromEntries(
    ['takeaway', 'delivery', 'dine_in'].map((t) => [t, customerMethods(payments, t)])
  );
  return (
    <section className='container pt-32 pb-24'>
      <p className='eyebrow text-primary mb-3'>Almost there</p>
      <h2 className='font-display font-medium mb-10'>Checkout</h2>
      {business.onlineOrdering ? (
        <CheckoutForm methodsByType={methodsByType} />
      ) : (
        <p className='text-muted-foreground'>Online ordering is paused right now. Please call us to order.</p>
      )}
    </section>
  );
}
