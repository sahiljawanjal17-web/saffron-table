'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/users/components/user-form-sheet.tsx
// Changes: menu item fields, server action instead of mock mutation.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { useAppForm } from '@/lib/form';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import type { MenuItem } from '@/db/schema';
import { toast } from 'sonner';
import { menuItemSchema, type MenuItemFormValues } from '../schema';
import { saveMenuItem } from '../actions';

const KIND_OPTIONS = [
  { value: 'dish', label: 'Dish (sold to customers)' },
  { value: 'raw', label: 'Raw inventory (vegetables, meat...)' }
];

interface MenuFormSheetProps {
  item?: MenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MenuFormSheet({ item, open, onOpenChange }: MenuFormSheetProps) {
  const isEdit = !!item;
  const [isPending, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      name: item?.name ?? '',
      description: item?.description ?? '',
      category: item?.category ?? 'Mains',
      kind: item?.kind ?? 'dish',
      price: item?.price ?? 0,
      unit: item?.unit ?? 'plate',
      imageUrl: item?.imageUrl ?? '',
      isVeg: item?.isVeg ?? true,
      isPermanent: item?.isPermanent ?? false,
      isSignature: item?.isSignature ?? false,
      defaultDailyQty: item?.defaultDailyQty ?? 20,
      active: item?.active ?? true
    } as MenuItemFormValues,
    validators: {
      onSubmit: menuItemSchema
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        try {
          await saveMenuItem(item?.id ?? null, value);
          toast.success(isEdit ? 'Item updated' : 'Item added');
          onOpenChange(false);
          if (!isEdit) form.reset();
        } catch {
          toast.error("Couldn't save item. Try again.");
        }
      });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Item' : 'New Item'}</SheetTitle>
          <SheetDescription>
            Permanent items are added to every day&apos;s stock automatically with their default quantity.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='menu-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name='name'
                children={(field) => <field.TextField label='Name' required placeholder='Paneer Tikka' />}
              />
              <form.AppField
                name='kind'
                children={(field) => <field.SelectField label='Type' required options={KIND_OPTIONS} />}
              />
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='category'
                  children={(field) => <field.TextField label='Category' required placeholder='Mains' />}
                />
                <form.AppField
                  name='unit'
                  children={(field) => <field.TextField label='Unit' required placeholder='plate / kg' />}
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField
                  name='price'
                  children={(field) => <field.TextField label='Price' type='number' min={0} step='0.01' />}
                />
                <form.AppField
                  name='defaultDailyQty'
                  children={(field) => (
                    <field.TextField label='Default daily qty' type='number' min={0} step='0.5' />
                  )}
                />
              </div>
              <form.AppField
                name='description'
                children={(field) => <field.TextareaField label='Description' rows={3} maxLength={300} />}
              />
              <form.AppField
                name='imageUrl'
                children={(field) => (
                  <field.TextField label='Image URL' placeholder='/media/dishes/... or https://...' />
                )}
              />
              <form.AppField
                name='isPermanent'
                children={(field) => (
                  <field.SwitchField label='Permanent / fixed item' description='Auto-added to stock every day' />
                )}
              />
              <form.AppField name='isVeg' children={(field) => <field.SwitchField label='Vegetarian' />} />
              <form.AppField
                name='isSignature'
                children={(field) => <field.SwitchField label='Signature dish' description='Shown on the homepage' />}
              />
              <form.AppField name='active' children={(field) => <field.SwitchField label='Active' />} />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='menu-form-sheet'>
            {isEdit ? 'Update Item' : 'Create Item'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function MenuFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Item
      </Button>
      <MenuFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
