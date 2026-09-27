import * as z from 'zod';

// Pattern from starter features/users/schemas/user.ts
export const menuItemSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(1, 'Category is required'),
  kind: z.enum(['dish', 'raw']),
  price: z.number({ error: 'Price is required' }).min(0),
  unit: z.string().trim().min(1, 'Unit is required'),
  imageUrl: z.string().trim().optional(),
  isVeg: z.boolean(),
  isPermanent: z.boolean(),
  isSignature: z.boolean(),
  defaultDailyQty: z.number({ error: 'Quantity is required' }).min(0),
  active: z.boolean()
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
