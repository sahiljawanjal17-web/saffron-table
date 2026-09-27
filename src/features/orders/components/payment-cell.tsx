'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { METHOD_LABELS } from '@/lib/payment-methods';
import { markOrderPaid } from '../actions';

export function PaymentCell({
  id,
  method,
  status,
  reference,
  cancelled
}: {
  id: number;
  method: string;
  status: string;
  reference: string | null;
  cancelled: boolean;
}) {
  const [pending, start] = useTransition();
  const variant = status === 'paid' ? 'secondary' : status === 'failed' ? 'destructive' : 'outline';
  return (
    <div className='flex flex-col items-start gap-1'>
      <span className='text-xs'>{METHOD_LABELS[method] ?? method}</span>
      <div className='flex items-center gap-1'>
        <Badge variant={variant} className='capitalize' title={reference ?? ''}>
          {status === 'awaiting' ? 'verify' : status}
        </Badge>
        {!cancelled && status !== 'paid' && (
          <Button
            size='xs'
            variant='outline'
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await markOrderPaid(id);
                  toast.success('Marked as paid');
                } catch {
                  toast.error('Could not update payment');
                }
              })
            }
          >
            Mark paid
          </Button>
        )}
      </div>
      {reference && status === 'awaiting' && method === 'upi_qr' && (
        <span className='text-muted-foreground font-mono text-[10px]'>UTR {reference}</span>
      )}
    </div>
  );
}
