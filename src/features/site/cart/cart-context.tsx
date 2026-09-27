'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatMoney } from '@/lib/money';
import type { LiveMenuItem } from '../types';

export type CartLine = { menuItemId: number; name: string; price: number; qty: number; max: number; imageUrl: string | null };

type CartCtx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  taxPercent: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: LiveMenuItem) => void;
  setQty: (menuItemId: number, qty: number) => void;
  clear: () => void;
  money: (n: number) => string;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = 'st_cart_v1';

export function CartProvider({
  children,
  currency,
  locale,
  taxPercent
}: {
  children: React.ReactNode;
  currency: string;
  locale: string;
  taxPercent: number;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      // storage unavailable — cart stays in memory
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // ignore
    }
  }, [lines]);

  const add = useCallback((item: LiveMenuItem) => {
    setLines((prev) => {
      const found = prev.find((l) => l.menuItemId === item.menuItemId);
      if (found) {
        if (found.qty >= item.remaining) {
          toast.error(`Only ${item.remaining} ${item.name} left today`);
          return prev;
        }
        return prev.map((l) => (l.menuItemId === item.menuItemId ? { ...l, qty: l.qty + 1, max: item.remaining } : l));
      }
      return [
        ...prev,
        { menuItemId: item.menuItemId, name: item.name, price: item.price, qty: 1, max: item.remaining, imageUrl: item.imageUrl }
      ];
    });
    toast.success(`${item.name} added`, { action: { label: 'View order', onClick: () => setOpen(true) } });
  }, []);

  const setQty = useCallback((menuItemId: number, qty: number) => {
    setLines((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, qty: Math.min(Math.max(qty, 0), l.max) } : l))
        .filter((l) => l.qty > 0)
    );
  }, []);

  const value = useMemo<CartCtx>(() => {
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    return {
      lines,
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal,
      taxPercent,
      open,
      setOpen,
      add,
      setQty,
      clear: () => setLines([]),
      money: (n: number) => formatMoney(n, currency, locale)
    };
  }, [lines, open, add, setQty, currency, locale, taxPercent]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
