// Source: chef-kitchen (MIT) — types/menu.ts, plus LiveMenuItem for the live menu.
export type SubmenuItem = {
  label: string;
  href: string;
};

export type HeaderItem = {
  label: string;
  href: string;
  submenu?: SubmenuItem[];
};

/** Today's dish as shown to customers (from src/server/stock.ts getLiveMenu). */
export type LiveMenuItem = {
  menuItemId: number;
  name: string;
  description: string | null;
  category: string;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isSignature: boolean;
  remaining: number;
};
