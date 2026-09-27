import Header from '@/features/site/components/Header';
import Footer from '@/features/site/components/Footer';
import ScrollToTop from '@/features/site/components/ScrollToTop';
import { CartProvider } from '@/features/site/cart/cart-context';
import { CartSheet } from '@/features/site/cart/cart-sheet';
import { getAllSettings } from '@/lib/settings';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { brand, business } = await getAllSettings();
  return (
    <CartProvider currency={business.currency} locale={business.locale} taxPercent={business.taxPercent}>
      <div className='site overflow-x-clip'>
        <Header brandName={brand.name} phone={brand.phone} />
        <main>{children}</main>
        <Footer brand={brand} />
        <ScrollToTop />
        <CartSheet />
      </div>
    </CartProvider>
  );
}
