'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — products/components/product-tables/cell-action.tsx
// Changes: edit opens sheet, delete = deactivate via server action.
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
import type { MenuItem } from '@/db/schema';
import { Icons } from '@/components/icons';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { deleteMenuItem } from '../actions';
import { MenuFormSheet } from './menu-form-sheet';

interface CellActionProps {
  data: MenuItem;
}

export function CellAction({ data }: CellActionProps) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        description='The item will be hidden from menus. Past orders and reports stay intact.'
        onConfirm={() =>
          startTransition(async () => {
            try {
              await deleteMenuItem(data.id);
              toast.success('Item removed');
              setOpen(false);
            } catch {
              toast.error('Failed to remove item');
            }
          })
        }
        loading={isPending}
      />
      <MenuFormSheet item={data} open={editOpen} onOpenChange={setEditOpen} />
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
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <Icons.trash className='mr-2 h-4 w-4' /> Remove
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
