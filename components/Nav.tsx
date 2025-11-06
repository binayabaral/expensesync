'use client';

import isMobile from 'is-mobile';
import { useMedia } from 'react-use';
import { Loader2 } from 'lucide-react';
import { useState, Fragment } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClerkLoaded, ClerkLoading, UserButton, useUser } from '@clerk/nextjs';
import { FaLayerGroup, FaReceipt, FaWallet, FaTags, FaRightLeft, FaCirclePlus, FaHeart } from 'react-icons/fa6';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

function Nav() {
  const routes = [
    {
      href: '/',
      label: 'Overview',
      icon: FaLayerGroup
    },
    {
      href: '/transactions',
      label: 'Transactions',
      icon: FaReceipt
    },
    {
      href: '/transfers',
      label: 'Transfers',
      icon: FaRightLeft
    },
    {
      href: '/accounts',
      label: 'Accounts',
      icon: FaWallet
    },
    {
      href: '/categories',
      label: 'Categories',
      icon: FaTags
    },
    {
      href: '/health',
      label: 'Financial Health',
      icon: FaHeart
    }
  ];

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const router = useRouter();
  const { user } = useUser();
  const pathName = usePathname();
  const isSmallerScreen = useMedia('(max-width: 1024px)', false);
  const isMobileDevice = isMobile();

  const enableMobileNav = isSmallerScreen || isMobileDevice;

  const onSheetButtonClick = (href: string) => {
    router.push(href);
    setIsSheetOpen(false);
  };

  const renderUserAvatar = () => (
    <>
      <ClerkLoaded>
        <div className='flex flex-col items-center'>
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: cn(enableMobileNav ? 'size-5' : 'size-7')
              }
            }}
          />
          <span className={cn('mt-1 text-[11px]', enableMobileNav ? '' : 'hidden')}>{user?.fullName}</span>
        </div>
      </ClerkLoaded>
      <ClerkLoading>
        <Loader2 className={cn('animate-spin', enableMobileNav ? 'size-5' : 'size-7')} />
      </ClerkLoading>
    </>
  );

  return (
    <>
      <nav className={cn('flex items-center', enableMobileNav ? 'w-full justify-between' : 'gap-x-2')}>
        {routes.slice(0, enableMobileNav ? 3 : routes.length).map((route, index) => (
          <Fragment key={route.label}>
            <Button
              onClick={() => router.push(route.href)}
              variant='outline'
              className={cn(
                'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                pathName === route.href ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                enableMobileNav ? 'w-1/5 py-5 text-[11px] px-1 h-auto flex flex-col border border-r' : 'mr-1'
              )}
            >
              <route.icon className={cn(enableMobileNav ? 'size-7' : 'hidden')} />
              <span className='block'>{route.label}</span>
            </Button>
            {index === 1 && enableMobileNav && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant='outline'
                    className={cn(
                      'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                      isSheetOpen ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                      enableMobileNav ? 'w-1/5 py-5 text-[11px] px-1 h-auto flex flex-col border border-r' : 'mr-1'
                    )}
                  >
                    <FaCirclePlus className={cn(enableMobileNav ? 'size-7' : 'hidden')} />
                    All Options
                  </Button>
                </SheetTrigger>
                <SheetContent side='left' className='px-2 flex flex-col justify-between' title='Menu'>
                  <SheetTitle className='text-3xl text-center pt-40'>All Options</SheetTitle>
                  <div className='flex flex-col'>
                    <nav className='flex flex-wrap pt-6 pb-5'>
                      {routes.map(route => (
                        <Button
                          key={route.label}
                          variant='outline'
                          onClick={() => onSheetButtonClick(route.href)}
                          className={cn(
                            'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                            pathName === route.href ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                            enableMobileNav ? 'w-1/4 py-5 text-[11px] px-1 h-20 flex flex-col border border-r' : 'mr-1'
                          )}
                        >
                          <route.icon className={cn(enableMobileNav ? 'size-7' : 'hidden')} />
                          <span className='block'>{route.label}</span>
                        </Button>
                      ))}
                    </nav>
                    <SheetClose asChild>
                      <Button variant='outline' className='w-full mb-10'>
                        Close
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </Fragment>
        ))}
        <div className={cn(enableMobileNav ? 'w-1/5 text-center' : '')}>{renderUserAvatar()}</div>
      </nav>
    </>
  );
}

export default Nav;
