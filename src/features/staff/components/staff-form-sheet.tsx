'use client';
// Source: Kiranism/next-shadcn-dashboard-starter (MIT) — features/users/components/user-form-sheet.tsx
// Changes: staff fields (all optional except name/role), server action.

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
import type { Staff } from '@/db/schema';
import { toast } from 'sonner';
import { staffSchema, type StaffFormValues } from '../schema';
import { saveStaff } from '../actions';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On leave' },
  { value: 'inactive', label: 'Inactive' }
];

interface StaffFormSheetProps {
  member?: Staff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffFormSheet({ member, open, onOpenChange }: StaffFormSheetProps) {
  const isEdit = !!member;
  const [isPending, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      name: member?.name ?? '',
      role: member?.role ?? '',
      phone: member?.phone ?? '',
      email: member?.email ?? '',
      joinDate: member?.joinDate ?? '',
      salary: member?.salary ?? undefined,
      status: member?.status ?? 'active',
      notes: member?.notes ?? ''
    } as StaffFormValues,
    validators: {
      onSubmit: staffSchema
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        try {
          await saveStaff(member?.id ?? null, value);
          toast.success(isEdit ? 'Staff updated' : 'Staff added');
          onOpenChange(false);
          if (!isEdit) form.reset();
        } catch {
          toast.error("Couldn't save. Try again.");
        }
      });
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Staff' : 'New Staff'}</SheetTitle>
          <SheetDescription>Only name and role are required. Fill the rest whenever you like.</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form
            id='staff-form-sheet'
            className='space-y-4 p-4 md:p-4'
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField name='name' children={(field) => <field.TextField label='Name' required />} />
              <form.AppField
                name='role'
                children={(field) => <field.TextField label='Role' required placeholder='Chef, Server, Manager' />}
              />
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField name='phone' children={(field) => <field.TextField label='Phone' type='tel' />} />
                <form.AppField name='email' children={(field) => <field.TextField label='Email' type='email' />} />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <form.AppField name='joinDate' children={(field) => <field.TextField label='Join date' type='date' />} />
                <form.AppField
                  name='salary'
                  children={(field) => <field.TextField label='Monthly salary' type='number' min={0} />}
                />
              </div>
              <form.AppField
                name='status'
                children={(field) => <field.SelectField label='Status' required options={STATUS_OPTIONS} />}
              />
              <form.AppField name='notes' children={(field) => <field.TextareaField label='Notes' rows={3} />} />
            </FieldGroup>
          </form>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='staff-form-sheet'>
            {isEdit ? 'Update Staff' : 'Create Staff'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function StaffFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add Staff
      </Button>
      <StaffFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
