'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  FaLayerGroup,
  FaReceipt,
  FaWallet,
  FaTags,
  FaRightLeft,
  FaHeart,
  FaCoins,
  FaUsers,
  FaChartLine,
  FaArrowRightArrowLeft,
  FaMoneyBillTransfer
} from 'react-icons/fa6';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter
} from '@/components/ui/sidebar';
import { ClerkLoaded, ClerkLoading, UserButton, useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const mainItems = [
    {
      title: 'Overview',
      url: '/',
      icon: FaLayerGroup
    }
  ];

  const transactionItems = [
    {
      title: 'Transactions',
      url: '/transactions',
      icon: FaReceipt
    },
    {
      title: 'Transfers',
      url: '/transfers',
      icon: FaRightLeft
    }
  ];

  const accountItems = [
    {
      title: 'Accounts',
      url: '/accounts',
      icon: FaWallet
    },
    {
      title: 'Assets',
      url: '/assets',
      icon: FaCoins
    }
  ];

  const analyticsItems = [
    {
      title: 'Categories',
      url: '/categories',
      icon: FaTags
    },
    {
      title: 'Payees',
      url: '/payees',
      icon: FaUsers
    },
    {
      title: 'Financial Health',
      url: '/health',
      icon: FaHeart
    }
  ];

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader className='h-16 border-b border-sidebar-border flex items-center justify-start px-2'>
        <div className='flex items-center gap-3 w-full'>
          <div className='flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shrink-0'>
            <FaMoneyBillTransfer className='h-4 w-4' />
          </div>
          <div className='flex flex-col overflow-hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 transition-all duration-200'>
            <span className='text-base font-bold whitespace-nowrap'>ExpenseSync</span>
            <span className='text-xs text-muted-foreground whitespace-nowrap'>Finance Tracker</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className='h-4 w-4' />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Transactions */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <FaArrowRightArrowLeft className='h-4 w-4 mr-2' />
            Transactions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {transactionItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className='h-4 w-4' />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Accounts */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <FaWallet className='h-4 w-4 mr-2' />
            Accounts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className='h-4 w-4' />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <FaChartLine className='h-4 w-4 mr-2' />
            Analytics
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => router.push(item.url)}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <item.icon className='h-4 w-4' />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border'>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className='flex items-center gap-3 py-3 w-full'>
              <ClerkLoaded>
                <div className='shrink-0'>
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'h-9 w-9'
                      }
                    }}
                  />
                </div>
                <div className='flex flex-col overflow-hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 transition-all duration-200 min-w-0'>
                  <span className='text-sm font-semibold truncate'>{user?.fullName}</span>
                  <span className='text-xs text-muted-foreground truncate'>
                    {user?.primaryEmailAddress?.emailAddress}
                  </span>
                </div>
              </ClerkLoaded>
              <ClerkLoading>
                <Loader2 className='h-9 w-9 animate-spin' />
              </ClerkLoading>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
