import Hero from '@/features/site/components/Hero';
import Features from '@/features/site/components/Features';
import About from '@/features/site/components/About';
import SignatureMenu from '@/features/site/components/SignatureMenu';
import Reservation from '@/features/site/components/Reservation';
import { getSetting } from '@/lib/settings';
import { getLiveMenu } from '@/server/stock';
import { releaseStaleOnlinePayments } from '@/server/payments';

export default async function Home() {
  await releaseStaleOnlinePayments();
  const [brand, business, { date, items }] = await Promise.all([
    getSetting('brand'),
    getSetting('business'),
    getLiveMenu()
  ]);
  const signature = items.filter((i) => i.isSignature);
  const gallery = (signature.length >= 4 ? signature : items).slice(0, 6);

  return (
    <>
      <Hero title={brand.heroTitle} subtitle={brand.heroSubtitle} signatureCount={items.length} />
      <Features />
      <About about={brand.about} brandName={brand.name} />
      {items.length > 0 && <SignatureMenu galleryImages={gallery} fullMenu={items} />}
      {business.reservations && <Reservation menu={items} today={date} />}
    </>
  );
}
