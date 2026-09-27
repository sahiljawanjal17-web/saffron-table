'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { salaryPayments, staff } from '@/db/schema';
import { requireAdmin } from '@/lib/auth-server';
import { salaryPaymentSchema, staffSchema } from './schema';

const orNull = (v?: string) => (v && v.length ? v : null);

export async function saveStaff(id: number | null, raw: z.input<typeof staffSchema>) {
  await requireAdmin();
  const v = staffSchema.parse(raw);
  const values = {
    name: v.name,
    role: v.role,
    status: v.status,
    phone: orNull(v.phone),
    email: orNull(v.email),
    joinDate: orNull(v.joinDate),
    notes: orNull(v.notes),
    salary: v.salary ?? null
  };
  if (id) await db.update(staff).set(values).where(eq(staff.id, id));
  else await db.insert(staff).values(values);
  revalidatePath('/dashboard/staff');
}

export async function deleteStaff(id: number) {
  await requireAdmin();
  await db.delete(staff).where(eq(staff.id, id));
  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/finance');
}

export async function addSalaryPayment(raw: z.input<typeof salaryPaymentSchema>) {
  await requireAdmin();
  const v = salaryPaymentSchema.parse(raw);
  await db.insert(salaryPayments).values({ ...v, note: orNull(v.note) });
  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/finance');
}

export async function deleteSalaryPayment(id: number) {
  await requireAdmin();
  await db.delete(salaryPayments).where(eq(salaryPayments.id, id));
  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/finance');
}
