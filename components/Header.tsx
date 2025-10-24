import Link from 'next/link';
import Image from 'next/image';

import Nav from '@/components/Nav';
import Filters from '@/components/Filters';
import HeaderWelcome from '@/components/HeaderWelcome';

function Header() {
  return (
    <header className=''>
      <div className='bg-white py-3 md:py-4 shadow-sm'>
        <div className='container mx-auto px-2'>
          <div className='flex justify-between items-center'>
            <Link href='/' className='hidden lg:flex items-center'>
              <Image src='/logo.png' alt='logo' height={50} width={50} className='rounded-full' />
              <span className='ml-2 text-xl'>Expense Sync</span>
            </Link>
            <Nav />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-2">
        <HeaderWelcome />
        <Filters />
      </div>
    </header>
  );
}

export default Header;
