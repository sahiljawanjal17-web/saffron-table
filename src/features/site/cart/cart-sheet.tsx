'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCart } from './cart-context';

export function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button
      type='button'
      onClick={() => setOpen(true)}
      aria-label='Open order'
      className='relative flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-lg font-medium text-primary-foreground transition hover:opacity-90'>
      <Icon icon='solar:bag-4-bold' className='text-2xl' />
      <span className='hidden sm:inline'>Order</span>
      {count > 0 && (
        <span className='absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-foreground text-xs text-background'>
          {count}
        </span>
      )}
    </button>
  );
}

export function CartSheet() {
  const { lines, open, setOpen, setQty, subtotal, taxPercent, money } = useCart();
  const tax = (subtotal * taxPercent) / 100;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className='w-full sm:max-w-md'>
        <SheetHeader>
          <SheetTitle className='font-display text-3xl'>Your order</SheetTitle>
        </SheetHeader>
        <div className='flex-1 space-y-4 overflow-y-auto px-4'>
          {lines.length === 0 && (
            <div className='py-16 text-center'>
              <p className='text-muted-foreground'>Your order is empty.</p>
              <Button className='mt-4' nativeButton={false} render={<Link href='/menu' onClick={() => setOpen(false)} />}>
                Browse today&apos;s menu
              </Button>
            </div>
          )}
          {lines.map((l) => (
            <div key={l.menuItemId} className='flex items-center gap-3'>
              <Image
                src={l.imageUrl ?? '/media/space/plates.jpg'}
                alt=''
                width={64}
                height={64}
                className='size-16 rounded-lg object-cover'
              />
              <div className='min-w-0 flex-1'>
                <p className='truncate font-medium'>{l.name}</p>
                <p className='text-muted-foreground text-sm'>{money(l.price)}</p>
              </div>
              <div className='flex items-center gap-2'>
                <Button size='icon-sm' variant='outline' onClick={() => setQty(l.menuItemId, l.qty - 1)} aria-label='Less'>
                  −
                </Button>
                <span className='w-6 text-center tabular-nums'>{l.qty}</span>
                <Button
                  size='icon-sm'
                  variant='outline'
                  disabled={l.qty >= l.max}
                  onClick={() => setQty(l.menuItemId, l.qty + 1)}
                  aria-label='More'>
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <SheetFooter className='border-t'>
            <div className='w-full space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div className='text-muted-foreground flex justify-between'>
                <span>Tax ({taxPercent}%)</span>
                <span>{money(tax)}</span>
              </div>
              <div className='flex justify-between pt-2 text-base font-semibold'>
                <span>Total</span>
                <span>{money(subtotal + tax)}</span>
              </div>
            </div>
            <Button className='h-11 w-full' nativeButton={false} render={<Link href='/checkout' onClick={() => setOpen(false)} />}>
              Checkout
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
