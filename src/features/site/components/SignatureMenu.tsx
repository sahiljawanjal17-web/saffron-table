'use client'
// Source: chef-kitchen (MIT) — Home/Gallery. Changes: live signature dishes from DB, add-to-cart, currency.
import Image from 'next/image'
import Masonry from 'react-masonry-css'
import { useState } from 'react'
import { Icon } from '@iconify/react'
import type { LiveMenuItem } from '../types'
import { useCart } from '../cart/cart-context'

const Gallery = ({ galleryImages, fullMenu }: { galleryImages: LiveMenuItem[]; fullMenu: LiveMenuItem[] }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { add, money } = useCart()

  const openMenu = () => setIsMenuOpen(true)
  const closeMenu = () => setIsMenuOpen(false)

  return (
    <section id='menu' className='scroll-mt-20 py-16'>
      <div className='container'>
        <div className='text-center'>
          <p className='text-primary eyebrow mb-3'>
            Our Menu
          </p>
          <h2 className='font-display font-medium'>Explore Our Signature Dishes</h2>
        </div>
        <div className='my-16 px-6'>
          <Masonry
            breakpointCols={{ default: 2, '700': 2, '500': 1 }}
            className='flex gap-6'
            columnClassName='masonry-column'>
            {/* Map through images */}
            {galleryImages.map((item, index) => (
                  <div
                    key={index}
                    className='overflow-hidden rounded-3xl mb-6 relative group'>
                    <Image
                      src={item.imageUrl ?? '/media/space/plates.jpg'}
                      alt={item.name}
                      width={600}
                      height={index % 3 === 0 ? 720 : 500}
                      className={`object-cover w-full ${index % 3 === 0 ? 'aspect-[5/6]' : 'aspect-[6/5]'}`}
                    />
                    <div className='w-full h-full absolute bg-gradient-to-t from-black/85 via-black/20 to-transparent top-0 lg:top-full lg:group-hover:top-0 duration-500 lg:p-12 md:p-8 p-3.5 flex flex-col items-start lg:gap-8 gap-4 justify-end'>
                      <p className='font-display text-white lg:text-3xl text-2xl'>
                        {item.name}
                      </p>
                      <div className='flex items-center justify-between w-full'>
                        <p className='text-white lg:text-2xl text-xl'>
                          {money(item.price)}
                        </p>
                        <button
                          type='button'
                          disabled={item.remaining <= 0}
                          onClick={() => add(item)}
                          className='text-primary-foreground rounded-full bg-primary border duration-300 border-primary py-2 lg:px-6 md:px-4 px-3 hover:bg-primary/40 hover:backdrop-blur-xs md:text-base text-sm disabled:opacity-60'>
                          {item.remaining > 0 ? 'Add to order' : 'Sold out'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
          </Masonry>
        </div>
        <div className='flex justify-center'>
          <button
            className='px-6 py-2 border border-primary rounded-full text-base font-medium text-primary-foreground bg-primary hover:bg-primary/20 hover:text-primary hover:cursor-pointer transition ease-in-out duration-300'
            onClick={openMenu}>
            Today’s Full Menu
          </button>
          {/* menu pop-up */}
          {isMenuOpen && (
            <div
              className='fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center z-50 px-4'
              onClick={closeMenu}>
              <div
                className='relative mx-auto w-full max-w-2xl max-h-2/3 rounded-3xl px-4 pt-14 pb-8 text-center bg-background overflow-hidden'
                onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={closeMenu}
                  className='absolute top-0 right-0 mr-4 mt-8 hover:cursor-pointer'>
                  <Icon
                    icon='material-symbols:close-rounded'
                    width={24}
                    height={24}
                    className='text-foreground hover:text-primary text-24 inline-block me-2'
                  />
                </button>
                <p className='font-display text-foreground text-3xl font-semibold mb-4'>
                  Today’s Menu
                </p>
                {/* table */}
                <div className='max-h-[350px] overflow-y-auto'>
                  <table className='w-full table-auto border-collapse text-left'>
                    <thead className='sticky top-0 bg-muted z-10'>
                      <tr>
                        <th className='py-3 px-4'>Dish</th>
                        <th className='py-3 px-4'>Description</th>
                        <th className='py-3 px-4'>Price</th>
                        <th className='py-3 px-4'></th>
                      </tr>
                    </thead>
                    <tbody>
                      {fullMenu.map((item, index) => (
                        <tr key={index} className='border-t'>
                          <td className='py-2 px-4'>{item.name}</td>
                          <td className='py-2 px-4'>{item.description}</td>
                          <td className='py-2 px-4 whitespace-nowrap'>{money(item.price)}</td>
                          <td className='py-2 px-4'>
                            <button
                              type='button'
                              disabled={item.remaining <= 0}
                              onClick={() => add(item)}
                              className='rounded-full border border-primary px-3 py-1 text-sm text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50'>
                              {item.remaining > 0 ? 'Add' : 'Sold out'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Gallery
