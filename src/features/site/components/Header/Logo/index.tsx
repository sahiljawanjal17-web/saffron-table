// Source: chef-kitchen (MIT) — Header/Logo. Changes: text wordmark from brand settings.
import Link from 'next/link'

const Logo: React.FC<{ brandName: string }> = ({ brandName }) => {
  return (
    <Link href='/' className='flex items-center gap-3'>
      <span className='bg-primary text-primary-foreground font-display flex size-9 items-center justify-center rounded-full text-xl font-semibold'>
        {brandName.charAt(0)}
      </span>
      <p className='font-display text-foreground text-2xl font-semibold'>{brandName}</p>
    </Link>
  )
}

export default Logo
