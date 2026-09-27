'use client'
// Source: chef-kitchen (MIT) — Home/Features. Changes: static restaurant data, photos, theme tokens.
import Image from 'next/image'

const features = [
  { imgSrc: '/media/dishes/dal-makhani.jpg', heading: 'Cooked Fresh Daily', subheading: 'Spices ground every morning, breads baked to order.' },
  { imgSrc: '/media/space/chef.jpg', heading: 'Master Chefs', subheading: 'Recipes carried across three generations of cooks.' },
  { imgSrc: '/media/space/table-service.jpg', heading: 'Warm Hospitality', subheading: 'An unhurried table and attentive service, every visit.' },
  { imgSrc: '/media/dishes/masala-chai.jpg', heading: 'Order in Minutes', subheading: 'Live menu, instant bill, pick-up or delivery.' }
]

const Features = () => {
  return (
    <section id='features' className='py-24'>
      <div className='container'>
        <div className='text-center mb-14'>
          <p className='text-primary eyebrow'>
            Why Choose Us
          </p>
          <h2 className='font-display font-medium lg:max-w-60% mx-auto mt-3'>
            Experience More Than Just a Meal
          </h2>
        </div>
        <div className='grid sm:grid-cols-2 lg:grid-cols-4 gap-y-20 gap-x-6 mt-24'>
          {features.map((items, i) => (
                <div
                  key={i}
                  className='p-8 relative rounded-3xl bg-linear-to-b from-primary/10 to-card shadow-md hover:-translate-y-1 transition duration-300 ease-in-out hover:cursor-pointer'>
                  <div className='rounded-full flex justify-center absolute -top-14 left-1/2 -translate-x-1/2'>
                    <Image
                      src={items.imgSrc}
                      alt=''
                      width={112}
                      height={112}
                      className='size-28 rounded-full object-cover ring-4 ring-background shadow-lg'
                    />
                  </div>
                  <p className='font-display text-2xl text-foreground font-semibold text-center mt-14'>
                    {items.heading}
                  </p>
                  <p className='text-base font-normal text-foreground/55 text-center mt-2 leading-6'>
                    {items.subheading}
                  </p>
                </div>
              ))}
        </div>
      </div>
    </section>
  )
}

export default Features
