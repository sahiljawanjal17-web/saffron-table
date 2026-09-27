import Providers from '@/components/layout/providers';
import { Toaster } from '@/components/ui/sonner';
import { fontVariables } from '@/components/themes/font.config';
import ThemeProvider from '@/components/themes/theme-provider';
import { getSetting } from '@/lib/settings';
import { buildThemeCss } from '@/lib/theme-presets';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import '../styles/globals.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSetting('brand');
  const description = brand.heroSubtitle;
  return {
    ...(process.env.NEXT_PUBLIC_APP_URL
      ? { metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL) }
      : {}),
    title: { default: `${brand.name} — ${brand.tagline}`, template: `%s | ${brand.name}` },
    description,
    openGraph: {
      title: brand.name,
      description,
      siteName: brand.name,
      type: 'website',
      images: [{ url: '/media/space/spread.jpg', width: 2000, height: 1333, alt: brand.name }]
    },
    twitter: { card: 'summary_large_image', title: brand.name, description }
  };
}

export const viewport: Viewport = {
  themeColor: '#14110f'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getSetting('theme');

  return (
    <html lang='en' suppressHydrationWarning className={fontVariables}>
      <head>
        <style id='brand-theme' dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
      </head>
      <body
        className={cn('bg-background overflow-x-hidden overscroll-none font-sans antialiased')}
      >
        <NextTopLoader color='var(--primary)' showSpinner={false} />
        <NuqsAdapter>
          <ThemeProvider
            attribute='class'
            defaultTheme='light'
            enableSystem={false}
            disableTransitionOnChange
            enableColorScheme
          >
            <Providers>
              <Toaster />
              {children}
            </Providers>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
