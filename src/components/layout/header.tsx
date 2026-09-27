import Link from 'next/link';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import SearchInput from '../search-input';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { Button } from '../ui/button';
import { Icons } from '../icons';

export default function Header() {
  return (
    <header className='bg-background/70 no-print sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/60 backdrop-blur-md md:h-14'>
      <div className='flex items-center gap-2 px-4'>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4 data-vertical:self-center' />
        <Breadcrumbs />
      </div>

      <div className='flex items-center gap-2 px-4'>
        <div className='hidden md:flex'>
          <SearchInput />
        </div>
        <Button variant='outline' size='sm' nativeButton={false} render={<Link href='/' target='_blank' />}>
          <Icons.externalLink />
          <span className='hidden sm:inline'>View site</span>
        </Button>
        <ThemeModeToggle />
      </div>
    </header>
  );
}
