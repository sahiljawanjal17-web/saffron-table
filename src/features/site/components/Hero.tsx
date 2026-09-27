'use client'
// Source: chef-kitchen (MIT) — Home/Hero. Changes: brand copy from settings, image -> ambient video.
import Image from 'next/image'
import Link from 'next/link'

const Hero = ({ title, subtitle, signatureCount }: { title: string; subtitle: string; signatureCount: number }) => {
  return (
    <section id='home-section' className='bg-muted/60 pt-24'>
      <div className='container xl:pt-7 pt-16'>
        <div className='grid grid-cols-1 lg:grid-cols-12 items-center'>
          <div className='lg:col-span-6'>
            <h1 className='font-display font-medium mb-5 text-foreground lg:text-start text-center sm:leading-20 leading-16'>
              {title}
            </h1>
            <p className='text-foreground/60 text-lg font-normal mb-10 lg:text-start text-center'>
              {subtitle}
            </p>
            <div className='flex flex-col sm:flex-row gap-5 items-center justify-center lg:justify-start'>
              <Link href='/menu'>
                <button className='text-xl font-medium rounded-full text-primary-foreground py-3 px-8 bg-primary hover:text-primary border border-primary hover:bg-transparent hover:cursor-pointer transition ease-in-out duration-300'>
                  Order Online
                </button>
              </Link>
              <Link href='/#reserve'>
                <button className='text-xl border border-primary rounded-full font-medium py-3 px-8 text-primary hover:text-primary-foreground hover:bg-primary hover:cursor-pointer transition ease-in-out duration-300'>
                  Reserve a Table
                </button>
              </Link>
            </div>
          </div>
          <div className='lg:col-span-6 flex justify-center relative'>
            {signatureCount > 0 && (
            <div className='flex bg-background p-2 pr-5 gap-5 items-center bottom-16 left-0 lg:-left-6 rounded-xl absolute z-10 shadow-lg'>
              <Image
                src={'/media/dishes/butter-chicken.jpg'}
                alt=''
                width={68}
                height={68}
                className='size-17 rounded-lg object-cover'
              />
              <p className='text-lg font-normal'>
                {signatureCount}+ <br /> dishes today
              </p>
            </div>
            )}
            <video
              className='aspect-[4/5] w-full max-w-[520px] rounded-[2rem] object-cover shadow-2xl my-10'
              src='/media/video/hero-flame.mp4'
              poster='/media/video/hero-poster.jpg'
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
