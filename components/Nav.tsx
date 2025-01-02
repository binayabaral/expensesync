'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMedia } from 'react-use';
import { Loader2, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function Nav() {
  const routes = [
    {
      href: '/',
      label: 'Overview'
    },
    {
      href: '/transactions',
      label: 'Transactions'
    },
    {
      href: '/accounts',
      label: 'Accounts'
    },
    {
      href: '/categories',
      label: 'Categories'
    }
  ];

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const router = useRouter();
  const pathName = usePathname();
  const isMobile = useMedia('(max-width: 1024px)', false);

  const onSheetButtonClick = (href: string) => {
    router.push(href);
    setIsSheetOpen(false);
  };

  const renderUserAvatar = () => (
    <>
      <ClerkLoaded>
        <UserButton />
      </ClerkLoaded>
      <ClerkLoading>
        <Loader2 className='size-4 animate-spin' />
      </ClerkLoading>
    </>
  );

  if (isMobile) {
    return (
      <div className='w-full flex justify-between items-center'>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger className='p-2 rounded font-normal bg-white/10 hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/30 transition'>
            <Menu className='size-4' />
          </SheetTrigger>
          <SheetContent side='left' className='px-2' title='Menu'>
            <SheetTitle className='invisible'>Menu</SheetTitle>
            <nav className='flex flex-col gap-y-2 pt-6'>
              {routes.map(route => (
                <Button
                  key={route.label}
                  variant={route.href === pathName ? 'secondary' : 'ghost'}
                  onClick={() => onSheetButtonClick(route.href)}
                  className='w-full justify-start'
                >
                  {route.label}
                </Button>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        {renderUserAvatar()}
      </div>
    );
  }

  return (
    <nav className='hidden lg:flex items-center gap-x-2'>
      {routes.map(route => (
        <Button
          key={route.label}
          asChild
          variant='outline'
          className={cn(
            'w-full mr-1 lg:w-auto justify-between font-normal hover:bg-white/20 hover:text-white border-none focus-visible:ring-offset-0 focus-visible:ring-transparent outline-none text-white focus:bg-white/20 transition',
            pathName === route.href ? 'bg-white/10 ' : 'bg-transparent'
          )}
        >
          <Link href={route.href}>{route.label}</Link>
        </Button>
      ))}
      {renderUserAvatar()}
    </nav>
  );
}

export default Nav;
