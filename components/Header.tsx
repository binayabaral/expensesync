'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { ClerkLoaded, ClerkLoading, UserButton } from '@clerk/nextjs';
import { FaHome, FaExchangeAlt, FaUniversity, FaTags, FaArrowsAltH } from 'react-icons/fa';

import {
  Sidebar,
  SidebarMenu,
  SidebarGroup,
  SidebarFooter,
  SidebarHeader,
  SidebarContent,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupContent
} from './ui/sidebar';

const routes = [
  {
    href: '/',
    icon: <FaHome />,
    label: 'Overview'
  },
  {
    href: '/transactions',
    icon: <FaExchangeAlt />,
    label: 'Transactions'
  },
  {
    href: '/accounts',
    icon: <FaUniversity />,
    label: 'Accounts'
  },
  {
    href: '/categories',
    icon: <FaTags />,
    label: 'Categories'
  },
  {
    href: '/transfers',
    icon: <FaArrowsAltH />,
    label: 'Transfers'
  }
];

function Header() {
  return (
    <Sidebar collapsible='offcanvas'>
      <SidebarHeader className='py-5'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className='data-[slot=sidebar-menu-button]:!p-1.5'>
              <Link href='/' className='hidden lg:flex items-center py-6'>
                <Image src='/logo.svg' alt='logo' height={50} width={50} />
                <span className='ml-2 text-white text-xl'>Expense Sync</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='py-5'>
        <SidebarGroup>
          <SidebarGroupContent className='flex flex-col text-white'>
            <SidebarMenu>
              {routes.map(route => (
                <SidebarMenuItem key={route.label}>
                  <SidebarMenuButton asChild>
                    <Link href={route.href}>
                      {route.icon}
                      <span>{route.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className='pb-10 text-white'>
          <ClerkLoaded>
            <UserButton
              showName
              appearance={{
                elements: {
                  avatarBox: 'w-10 h-10',
                  userButtonTrigger: 'focus:outline-none focus:ring-0 focus:ring-offset-0 w-full',
                  userButtonBox:
                    'text-white text-2xl flex [&>*:first-child]:order-2 [&>*:last-child]:order-1 w-full hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded p-2',
                  userButtonOuterIdentifier: 'text-base',
                  rootBox: 'w-full'
                }
              }}
            />
          </ClerkLoaded>
          <ClerkLoading>
            <Loader2 className='size-10 animate-spin' />
          </ClerkLoading>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default Header;
