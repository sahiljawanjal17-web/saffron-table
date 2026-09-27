import Image from 'next/image';
import Link from 'next/link';
import { getSetting } from '@/lib/settings';
import { LoginForm } from './login-form';

export const metadata = { title: 'Owner login' };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, brand] = await Promise.all([searchParams, getSetting('brand')]);
  return (
    <div className='grid min-h-svh lg:grid-cols-2'>
      <div className='relative hidden lg:block'>
        <Image src='/media/space/dining-room.jpg' alt='' fill priority className='object-cover' sizes='50vw' />
        <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10' />
        <div className='absolute bottom-12 left-12 max-w-md text-white'>
          <p className='eyebrow text-white/70'>Back of house</p>
          <p className='font-display mt-3 text-5xl leading-tight'>{brand.name}</p>
          <p className='mt-3 text-white/75'>Orders, stock, staff and AI insights in one calm place.</p>
        </div>
      </div>
      <div className='flex items-center justify-center p-6'>
        <div className='w-full max-w-sm'>
          <Link href='/' className='font-display text-3xl font-semibold'>
            {brand.name}
          </Link>
          <p className='text-muted-foreground mt-2 text-sm'>Sign in to the management console.</p>
          <LoginForm next={next ?? '/dashboard/overview'} />
          {process.env.NODE_ENV !== 'production' && !process.env.ADMIN_PASSWORD && (
            <p className='text-muted-foreground mt-6 text-xs'>
              Dev mode: default password is <code className='font-mono'>admin123</code> (set ADMIN_PASSWORD).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
