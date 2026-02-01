'use client';

import isMobile from 'is-mobile';
import { useMedia } from 'react-use';
import { Loader2, ChevronDown } from 'lucide-react';
import { useState, Fragment } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ClerkLoaded, ClerkLoading, UserButton, useUser } from '@clerk/nextjs';
import { FaLayerGroup, FaReceipt, FaWallet, FaTags, FaRightLeft, FaCirclePlus, FaHeart, FaCoins, FaUsers, FaChartLine, FaArrowRightArrowLeft } from 'react-icons/fa6';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function Nav() {
  const overviewRoute = {
    href: '/',
    label: 'Overview',
    icon: FaLayerGroup
  };

  const transactionRoutes = [
    {
      href: '/transactions',
      label: 'Transactions',
      icon: FaReceipt
    },
    {
      href: '/transfers',
      label: 'Transfers',
      icon: FaRightLeft
    }
  ];

  const accountRoutes = [
    {
      href: '/accounts',
      label: 'Accounts',
      icon: FaWallet
    },
    {
      href: '/assets',
      label: 'Assets',
      icon: FaCoins
    }
  ];

  const analyticsRoutes = [
    {
      href: '/categories',
      label: 'Categories',
      icon: FaTags
    },
    {
      href: '/payees',
      label: 'Payees',
      icon: FaUsers
    },
    {
      href: '/health',
      label: 'Financial Health',
      icon: FaHeart
    }
  ];

  const allRoutes = [overviewRoute, ...transactionRoutes, ...accountRoutes, ...analyticsRoutes];

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

  const isActiveGroup = (routes: typeof transactionRoutes) => routes.some(route => pathName === route.href);

  return (
    <>
      <nav className={cn('flex items-center', enableMobileNav ? 'w-full justify-between' : 'gap-x-2')}>
        {enableMobileNav ? (
          <>
            {/* Mobile: Show Overview + first 2 transaction routes */}
            <Button
              onClick={() => router.push(overviewRoute.href)}
              variant='outline'
              className={cn(
                'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                pathName === overviewRoute.href ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                'w-1/5 py-5 text-[11px] px-1 h-auto flex flex-col border border-r'
              )}
            >
              <overviewRoute.icon className='size-7' />
              <span className='block'>{overviewRoute.label}</span>
            </Button>
            {transactionRoutes.map((route, index) => (
              <Fragment key={route.label}>
                <Button
                  onClick={() => router.push(route.href)}
                  variant='outline'
                  className={cn(
                    'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                    pathName === route.href ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                    'w-1/5 py-5 text-[11px] px-1 h-auto flex flex-col border border-r'
                  )}
                >
                  <route.icon className='size-7' />
                  <span className='block'>{route.label}</span>
                </Button>
                {index === 1 && (
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button
                        variant='outline'
                        className={cn(
                          'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                          isSheetOpen ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                          'w-1/5 py-5 text-[11px] px-1 h-auto flex flex-col border border-r'
                        )}
                      >
                        <FaCirclePlus className='size-7' />
                        All Options
                      </Button>
                    </SheetTrigger>
                    <SheetContent side='left' className='px-2 flex flex-col justify-between' title='Menu'>
                      <SheetTitle className='text-3xl text-center pt-40'>All Options</SheetTitle>
                      <div className='flex flex-col'>
                        <nav className='flex flex-wrap pt-6 pb-5'>
                          {allRoutes.map(route => (
                            <Button
                              key={route.label}
                              variant='outline'
                              onClick={() => onSheetButtonClick(route.href)}
                              className={cn(
                                'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary',
                                pathName === route.href ? 'bg-green-500/10 text-primary' : 'bg-transparent',
                                'w-1/4 py-5 text-[11px] px-1 h-20 flex flex-col border border-r'
                              )}
                            >
                              <route.icon className='size-7' />
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
          </>
        ) : (
          <>
            {/* Desktop: Overview + dropdown groups */}
            <Button
              onClick={() => router.push(overviewRoute.href)}
              variant='outline'
              className={cn(
                'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary mr-1',
                pathName === overviewRoute.href ? 'bg-green-500/10 text-primary' : 'bg-transparent'
              )}
            >
              <span className='block'>{overviewRoute.label}</span>
            </Button>

            {/* Transactions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary mr-1',
                    isActiveGroup(transactionRoutes) ? 'bg-green-500/10 text-primary' : 'bg-transparent'
                  )}
                >
                  <FaArrowRightArrowLeft className='mr-2 h-4 w-4' />
                  Transactions
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                {transactionRoutes.map(route => (
                  <DropdownMenuItem
                    key={route.label}
                    onClick={() => router.push(route.href)}
                    className={cn(
                      'cursor-pointer',
                      pathName === route.href ? 'bg-green-500/10 text-primary' : ''
                    )}
                  >
                    <route.icon className='mr-2 h-4 w-4' />
                    {route.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Accounts Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary mr-1',
                    isActiveGroup(accountRoutes) ? 'bg-green-500/10 text-primary' : 'bg-transparent'
                  )}
                >
                  <FaWallet className='mr-2 h-4 w-4' />
                  Accounts
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                {accountRoutes.map(route => (
                  <DropdownMenuItem
                    key={route.label}
                    onClick={() => router.push(route.href)}
                    className={cn(
                      'cursor-pointer',
                      pathName === route.href ? 'bg-green-500/10 text-primary' : ''
                    )}
                  >
                    <route.icon className='mr-2 h-4 w-4' />
                    {route.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Analytics Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    'justify-between font-normal border-none outline-none transition shadow-none hover:bg-green-500/10 hover:text-primary mr-1',
                    isActiveGroup(analyticsRoutes) ? 'bg-green-500/10 text-primary' : 'bg-transparent'
                  )}
                >
                  <FaChartLine className='mr-2 h-4 w-4' />
                  Analytics
                  <ChevronDown className='ml-2 h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start'>
                {analyticsRoutes.map(route => (
                  <DropdownMenuItem
                    key={route.label}
                    onClick={() => router.push(route.href)}
                    className={cn(
                      'cursor-pointer',
                      pathName === route.href ? 'bg-green-500/10 text-primary' : ''
                    )}
                  >
                    <route.icon className='mr-2 h-4 w-4' />
                    {route.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        <div className={cn(enableMobileNav ? 'w-1/5 text-center' : '')}>{renderUserAvatar()}</div>
      </nav>
    </>
  );
}

export default Nav;
