import * as z from 'zod';

// Pattern from starter features/users/schemas/user.ts — most fields optional on purpose.
export const staffSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  role: z.string().trim().min(1, 'Role is required'),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  joinDate: z.string().trim().optional(),
  salary: z.number().min(0).optional(),
  status: z.enum(['active', 'on_leave', 'inactive']),
  notes: z.string().trim().optional()
});

export type StaffFormValues = z.infer<typeof staffSchema>;

export const salaryPaymentSchema = z.object({
  staffId: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'),
  amount: z.number().positive('Amount must be more than 0'),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().optional()
});
