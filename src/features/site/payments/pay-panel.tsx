'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { brandPrimaryColor, payWithRazorpay, payWithStripe } from './start-payment';

type Upi = { link: string; qr: string; upiId: string; payee: string; amount: number };

export function PayPanel({
  code,
  method,
  status,
  amountLabel
}: {
  code: string;
  method: string;
  status: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [upi, setUpi] = useState<Upi | null>(null);
  const [utr, setUtr] = useState('');

  useEffect(() => {
    if (method !== 'upi_qr') return;
    fetch(`/api/payments/upi?code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((d) => (d.error ? toast.error(d.error) : setUpi(d)))
      .catch(() => toast.error('Could not load UPI QR'));
  }, [code, method]);

  const retry = async () => {
    setBusy(true);
    try {
      if (method === 'razorpay') {
        const paid = await payWithRazorpay(code, brandPrimaryColor());
        if (paid) toast.success('Payment successful');
        router.refresh();
      } else if (method === 'stripe') {
        await payWithStripe(code);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  if (method === 'upi_qr') {
    return (
      <div className='bg-card mb-8 rounded-2xl border p-6'>
        <p className='font-display mb-1 text-2xl'>Pay {amountLabel} with UPI</p>
        <p className='text-muted-foreground mb-5 text-sm'>
          Scan with GPay, PhonePe, Paytm or any UPI app. Your order starts as soon as we confirm the payment.
        </p>
        {upi ? (
          <div className='flex flex-col items-center gap-5 sm:flex-row sm:items-start'>
            <Image src={upi.qr} alt='UPI QR code' width={200} height={200} unoptimized className='rounded-lg border bg-white p-2' />
            <div className='w-full space-y-3 text-sm'>
              <p>
                UPI ID: <span className='font-mono font-medium'>{upi.upiId}</span>
                <br />
                Payee: {upi.payee}
              </p>
              <Button nativeButton={false} className='w-full sm:hidden' render={<a href={upi.link} />}>
                Open UPI app
              </Button>
              {status === 'awaiting' ? (
                <p className='text-primary font-medium'>Thanks! We are verifying your payment.</p>
              ) : (
                <div className='flex gap-2'>
                  <Input placeholder='UPI reference / UTR (optional)' value={utr} onChange={(e) => setUtr(e.target.value)} />
                  <Button
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      const res = await fetch('/api/payments/upi/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, utr })
                      });
                      setBusy(false);
                      if (res.ok) {
                        toast.success('Thanks! We will confirm shortly.');
                        router.refresh();
                      } else toast.error('Could not submit');
                    }}
                  >
                    I have paid
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>Loading QR…</p>
        )}
      </div>
    );
  }

  return (
    <div className='bg-card mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6'>
      <div>
        <p className='font-display text-2xl'>Payment pending</p>
        <p className='text-muted-foreground text-sm'>
          {status === 'failed' ? 'The last attempt did not go through.' : 'Complete the payment to confirm your order.'}
        </p>
      </div>
      <Button size='lg' disabled={busy} onClick={retry}>
        {busy ? 'Opening…' : `Pay ${amountLabel}`}
      </Button>
    </div>
  );
}
