'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  adminPassword,
  createSessionToken,
  safeEqual,
  sessionCookieOptions
} from '@/lib/auth';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard/overview');
  if (!safeEqual(password, adminPassword())) {
    await new Promise((r) => setTimeout(r, 600));
    return { error: 'Incorrect password' };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  redirect(next.startsWith('/dashboard') ? next : '/dashboard/overview');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
