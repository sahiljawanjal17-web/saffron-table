'use client'
// Source: GetNextjsTemplates/chef-kitchen-nextjs-landing-page-template (MIT) — Layout/Header
// Changes: auth modals -> cart + reserve, links/phone from brand settings, theme tokens.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import HeaderLink from './Navigation/HeaderLink'
import MobileHeaderLink from './Navigation/MobileHeaderLink'
import { Icon } from '@iconify/react/dist/iconify.js'
import { HeaderItem } from '../../types'
import { CartButton } from '../../cart/cart-sheet'

const headerLink: HeaderItem[] = [
  { label: 'Home', href: '/#home-section' },
  { label: 'About', href: '/#aboutus' },
  { label: 'Signature', href: '/#menu' },
  { label: 'Order Online', href: '/menu' },
  { label: 'Reserve', href: '/#reserve' }
]

const Header: React.FC<{ brandName: string; phone: string }> = ({ brandName, phone }) => {
  const [navbarOpen, setNavbarOpen] = useState(false)
  const [sticky, setSticky] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  const handleScroll = () => {
    setSticky(window.scrollY >= 20)
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (
      mobileMenuRef.current &&
      !mobileMenuRef.current.contains(event.target as Node) &&
      navbarOpen
    ) {
      setNavbarOpen(false)
    }
  }

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [navbarOpen])

  useEffect(() => {
    if (navbarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  }, [navbarOpen])

  return (
    <header
      className={`fixed top-0 z-40 py-4 w-full transition-all duration-300 ${
        sticky ? 'shadow-lg bg-background/95 backdrop-blur' : 'shadow-none'
      }`}>
      <div>
        <div className='container flex items-center justify-between'>
          <div>
            <Logo brandName={brandName} />
          </div>
          <nav className='hidden lg:flex grow items-center gap-4 xl:gap-6  justify-center'>
            {headerLink.map((item, index) => (
              <HeaderLink key={index} item={item} />
            ))}
          </nav>
          <div className='flex items-center gap-2 lg:gap-3'>
            <Link
              href={`tel:${phone.replace(/\s/g, '')}`}
              className='text-lg font-medium hover:text-primary hidden xl:block'>
              <Icon
                icon='solar:phone-bold'
                className='text-primary text-3xl lg:text-2xl inline-block me-2'
              />
              {phone}
            </Link>
            <Link
              href='/#reserve'
              className='hidden lg:block text-primary duration-300 bg-primary/15 hover:text-primary-foreground hover:bg-primary font-medium text-lg py-2 px-6 rounded-full hover:cursor-pointer'>
              Reserve
            </Link>
            <CartButton />
            <button
              onClick={() => setNavbarOpen(!navbarOpen)}
              className='block lg:hidden p-2 rounded-lg'
              aria-label='Toggle mobile menu'>
              <span className='block w-6 h-0.5 bg-foreground'></span>
              <span className='block w-6 h-0.5 bg-foreground mt-1.5'></span>
              <span className='block w-6 h-0.5 bg-foreground mt-1.5'></span>
            </button>
          </div>
        </div>
        {navbarOpen && (
          <div className='fixed top-0 left-0 w-full h-full bg-black/50 z-40' />
        )}
        <div
          ref={mobileMenuRef}
          className={`lg:hidden fixed top-0 right-0 h-full w-full bg-background shadow-lg transform transition-transform duration-300 max-w-xs ${
            navbarOpen ? 'translate-x-0' : 'translate-x-full'
          } z-50`}>
          <div className='flex items-center justify-between gap-2 p-4'>
            <div>
              <Logo brandName={brandName} />
            </div>
            {/*  */}
            <button
              onClick={() => setNavbarOpen(false)}
              className="hover:cursor-pointer"
              aria-label='Close menu Modal'>
              <Icon
                icon='material-symbols:close-rounded'
                width={24}
                height={24}
                className='text-foreground hover:text-primary text-24 inline-block me-2'
              />
            </button>
          </div>
          <Link
            href={`tel:${phone.replace(/\s/g, '')}`}
            className='text-lg font-medium hover:text-primary block md:hidden mt-6 p-4'>
            <Icon
              icon='solar:phone-bold'
              className='text-primary text-3xl lg:text-2xl inline-block me-2'
            />
            {phone}
          </Link>
          <nav className='flex flex-col items-start p-4'>
            {headerLink.map((item, index) => (
              <MobileHeaderLink key={index} item={item} />
            ))}
            <div className='mt-4 flex flex-col space-y-4 w-full'>
              <Link
                href='/menu'
                onClick={() => setNavbarOpen(false)}
                className='bg-primary text-primary-foreground text-center px-4 py-2 rounded-lg border border-primary hover:text-primary hover:bg-transparent transition duration-300 ease-in-out'>
                Order Online
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
