'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — products/components/product-tables/cell-action.tsx
// Changes: edit sheet, record salary dialog, server actions.
import { AlertModal } from '@/components/modal/alert-modal';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Staff } from '@/db/schema';
import { Icons } from '@/components/icons';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { addSalaryPayment, deleteStaff } from '../actions';
import { StaffFormSheet } from './staff-form-sheet';

interface CellActionProps {
  data: Staff;
}

export function CellAction({ data }: CellActionProps) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  function onPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await addSalaryPayment({
          staffId: data.id,
          month: String(f.get('month')),
          amount: Number(f.get('amount')),
          paidOn: String(f.get('paidOn')),
          note: String(f.get('note') ?? '')
        });
        toast.success('Salary recorded');
        setPayOpen(false);
      } catch {
        toast.error('Could not record salary');
      }
    });
  }

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        description='This also removes the salary history for this person.'
        onConfirm={() =>
          startTransition(async () => {
            try {
              await deleteStaff(data.id);
              toast.success('Staff removed');
              setOpen(false);
            } catch {
              toast.error('Failed to remove');
            }
          })
        }
        loading={isPending}
      />
      <StaffFormSheet member={data} open={editOpen} onOpenChange={setEditOpen} />
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record salary · {data.name}</DialogTitle>
          </DialogHeader>
          <form id={`pay-${data.id}`} onSubmit={onPay} className='grid gap-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label htmlFor='month'>Month</Label>
                <Input id='month' name='month' type='month' required defaultValue={today.slice(0, 7)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='paidOn'>Paid on</Label>
                <Input id='paidOn' name='paidOn' type='date' required defaultValue={today} />
              </div>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='amount'>Amount</Label>
              <Input id='amount' name='amount' type='number' min={1} required defaultValue={data.salary ?? ''} />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='note'>Note</Label>
              <Input id='note' name='note' placeholder='Bonus, advance...' />
            </div>
          </form>
          <DialogFooter>
            <Button type='submit' form={`pay-${data.id}`} disabled={isPending}>
              Save payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger render={<Button variant='ghost' className='h-8 w-8 p-0' />}>
          <span className='sr-only'>Open menu</span>
          <Icons.ellipsis className='h-4 w-4' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Icons.edit className='mr-2 h-4 w-4' /> Update
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPayOpen(true)}>
              <Icons.cash className='mr-2 h-4 w-4' /> Record salary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Icons.trash className='mr-2 h-4 w-4' /> Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
