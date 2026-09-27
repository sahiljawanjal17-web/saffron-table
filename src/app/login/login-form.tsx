'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className='mt-8 space-y-4'>
      <input type='hidden' name='next' value={next} />
      <div className='space-y-2'>
        <Label htmlFor='password'>Password</Label>
        <Input
          id='password'
          name='password'
          type='password'
          autoComplete='current-password'
          required
          autoFocus
          className='h-10'
        />
      </div>
      {state?.error && <p className='text-destructive text-sm'>{state.error}</p>}
      <Button type='submit' className='h-10 w-full' disabled={pending}>
        {pending ? 'Signing in...' : 'Sign in'}
      </Button>
    </form>
  );
}
