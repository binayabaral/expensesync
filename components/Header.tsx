import Link from 'next/link';
import Image from 'next/image';

import Nav from '@/components/Nav';
import HeaderWelcome from '@/components/HeaderWelcome';

function Header() {
  return (
    <header className='bg-gradient-to-b from-green-700 to-green-500 py-8 pb-36'>
      <div className='container mx-auto px-2'>
        <div className='flex justify-between items-center'>
          <Link href='/' className='hidden lg:flex items-center'>
            <Image src='/logo.svg' alt='logo' height={50} width={50} />
            <span className='ml-2 text-white text-xl'>Expense Sync</span>
          </Link>
          <Nav />
        </div>
        <HeaderWelcome />
      </div>
    </header>
  );
}

export default Header;
