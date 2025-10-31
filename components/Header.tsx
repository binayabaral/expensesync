'use client';

import Link from 'next/link';
import Image from 'next/image';
import isMobile from 'is-mobile';
import { useMedia } from 'react-use';

import { cn } from '@/lib/utils';
import Nav from '@/components/Nav';
import Filters from '@/components/Filters';
import HeaderWelcome from '@/components/HeaderWelcome';

function Header() {
  const isSmallerScreen = useMedia('(max-width: 1024px)', false);
  const isMobileDevice = isMobile();

  const enableMobileNav = isSmallerScreen || isMobileDevice;

  return (
    <header>
      <div
        className={cn(
          'bg-white shadow-sm',
          enableMobileNav ? 'fixed bottom-0 left-0 right-0 z-50 border-t' : 'py-3 md:py-4'
        )}
      >
        <div className='container mx-auto px-2'>
          <div className='flex justify-between items-center'>
            <Link href='/' className={cn(enableMobileNav ? 'hidden' : 'flex items-center')}>
              <Image src='/logo.png' alt='logo' height={50} width={50} className='rounded-full' />
              <span className='ml-2 text-xl'>Expense Sync</span>
            </Link>
            <Nav />
          </div>
        </div>
      </div>
      <div className='container mx-auto px-2'>
        <HeaderWelcome />
        <Filters />
      </div>
    </header>
  );
}

export default Header;
