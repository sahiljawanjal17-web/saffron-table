'use client'
// Source: chef-kitchen (MIT) — Layout/Footer. Changes: brand/contact from settings, restaurant links.

import React, { FC } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import Logo from './Header/Logo'
import type { BrandSettings } from '@/lib/settings'

const footerlink = [
  {
    section: 'Visit',
    links: [
      { label: 'About us', href: '/#aboutus' },
      { label: 'Signature dishes', href: '/#menu' },
      { label: 'Reserve a table', href: '/#reserve' }
    ]
  },
  {
    section: 'Order',
    links: [
      { label: 'Order online', href: '/menu' },
      { label: 'Book a table', href: '/#reserve' },
      { label: 'Owner login', href: '/login' }
    ]
  }
]

const Footer: FC<{ brand: BrandSettings }> = ({ brand }) => {

  return (
    <footer className='pt-16 bg-muted/60 border-t'>
      <div className='container'>
        <div className='grid grid-cols-1 sm:grid-cols-6 lg:gap-20 md:gap-24 sm:gap-12 gap-12 pb-10'>
          <div className='col-span-2'>
            <Logo brandName={brand.name} />
            <p className='text-sm font-medium text-muted-foreground my-5 max-w-70%'>
              {brand.tagline}. {brand.hours}
            </p>
            <div className='flex gap-6 items-center'>
              {brand.instagram && (
                <Link
                  href={`https://instagram.com/${brand.instagram}`}
                  target='_blank'
                  className='group bg-background hover:bg-primary rounded-full shadow-xl p-3'>
                  <Icon
                    icon='fa6-brands:instagram'
                    width='16'
                    height='16'
                    className=' group-hover:text-primary-foreground text-foreground'
                  />
                </Link>
              )}
            </div>
          </div>
          <div className='col-span-2'>
            <div className='flex gap-20'>
              {footerlink.map((product, i) => (
                <div key={i} className='group relative col-span-2'>
                  <p className='font-display text-foreground text-xl font-semibold mb-6'>
                    {product.section}
                  </p>
                  <ul>
                    {product.links.map((item, i) => (
                      <li key={i} className='mb-3'>
                        <Link
                          href={item.href}
                          className='text-foreground/60 hover:text-foreground text-base font-normal mb-6'>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div className='col-span-2 sm:col-span-6 md:col-span-2'>
            <div className='flex flex-col gap-5'>
              <div className='flex'>
                <Icon
                  icon='solar:point-on-map-perspective-bold'
                  className='text-primary text-3xl lg:text-2xl inline-block me-2'
                />
                <p className='text-foreground text-base'>
                  {brand.address}
                </p>
              </div>
              <Link href={`tel:${brand.phone.replace(/\s/g, '')}`}>
                <div className='flex'>
                  <Icon
                    icon='solar:phone-bold'
                    className='text-primary text-3xl lg:text-2xl inline-block me-2'
                  />
                  <p className='text-foreground/60 hover:text-foreground text-base'>
                    {brand.phone}
                  </p>
                </div>
              </Link>
              <Link href={`mailto:${brand.email}`}>
                <div className='flex'>
                  <Icon
                    icon='solar:mailbox-bold'
                    className='text-primary text-3xl lg:text-2xl inline-block me-2'
                  />
                  <p className='text-foreground/60 hover:text-foreground text-base'>
                    {brand.email}
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
        <div className='border-t border-border py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-5'>
          <p className='text-sm text-foreground/70'>
            © {new Date().getFullYear()} {brand.name}. All rights reserved.
          </p>

          <div className=''>
            <Link
              href='#'
              className='text-sm text-foreground/70 px-5 border-r border-border hover:text-primary hover:underline'>
              Privacy policy
            </Link>
            <Link
              href='#'
              className='text-sm text-foreground/70 px-5 hover:text-primary hover:underline'>
              Terms & conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
