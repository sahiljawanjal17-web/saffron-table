'use client'
// Source: chef-kitchen (MIT) — Home/Cook. Changes: renamed About, brand story from settings, photo.

import Image from 'next/image'

const About = ({ about, brandName }: { about: string; brandName: string }) => {
  return (
    <section className='relative py-16 scroll-mt-20' id='aboutus'>
      <div className='container px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-12 my-16 space-x-5'>
          <div className='lg:col-span-6 flex lg:justify-start justify-center'>
            <Image
              src='/media/space/kitchen.jpg'
              alt='Our chefs at work'
              width={636}
              height={808}
              className='aspect-[4/5] w-full max-w-[520px] rounded-[2rem] object-cover'
            />
          </div>
          <div className='lg:col-span-6 flex flex-col justify-center items-center lg:items-start'>
            <p className='text-primary eyebrow mb-3 lg:text-start text-center'>
              About Us
            </p>
            <h2 className='font-display font-medium lg:text-start text-center'>
              Crafted with Passion, Served with Pride
            </h2>
            <p className='text-foreground/60 text-lg font-normal my-5 text-start'>
              {about}
            </p>
            <p className='text-foreground/60 text-lg font-normal mb-10 text-start'>
              Whether you’re celebrating a special occasion or enjoying a quiet
              evening out, {brandName} promises something truly special for every guest.
            </p>
            <a href='#reserve' className='text-xl font-medium rounded-full text-primary-foreground py-3 px-8 duration-300 bg-primary w-fit border border-primary hover:bg-transparent hover:text-primary hover:cursor-pointer'>
              Reserve a table
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
