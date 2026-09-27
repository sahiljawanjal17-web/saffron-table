import { Cormorant_Garamond, Geist_Mono, Manrope } from 'next/font/google';

import { cn } from '@/lib/utils';

const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope'
});

const fontDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant'
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono'
});

export const fontVariables = cn(fontSans.variable, fontDisplay.variable, fontMono.variable);
