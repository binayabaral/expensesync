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
  FaMoneyBillTransfer,
  FaArrowsRotate,
  FaCreditCard,
  FaFileInvoiceDollar,
  FaScaleBalanced,
  FaRobot
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
  SidebarFooter,
  useSidebar
} from '@/components/ui/sidebar';
import { ClerkLoaded, ClerkLoading, UserButton, useUser } from '@clerk/nextjs';
import { shadcn } from '@clerk/themes';
import { Loader2 } from 'lucide-react';

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { setOpenMobile } = useSidebar();

  const navigate = (url: string) => {
    setOpenMobile(false);
    router.push(url);
  };

  const mainItems = [
    {
      title: 'Overview',
      url: '/dashboard',
      icon: FaLayerGroup
    }
  ];

  const transactionItems = [
    {
      title: 'Transactions',
      url: '/dashboard/transactions',
      icon: FaReceipt
    },
    {
      title: 'Transfers',
      url: '/dashboard/transfers',
      icon: FaRightLeft
    },
    {
      title: 'Recurring',
      url: '/dashboard/recurring-payments',
      icon: FaArrowsRotate
    },
    {
      title: 'Bill Split',
      url: '/dashboard/bill-split',
      icon: FaScaleBalanced
    }
  ];

  const accountItems = [
    {
      title: 'Accounts',
      url: '/dashboard/accounts',
      icon: FaWallet
    },
    {
      title: 'Credit Cards',
      url: '/dashboard/credit-cards',
      icon: FaCreditCard
    },
    {
      title: 'Loans',
      url: '/dashboard/loans',
      icon: FaFileInvoiceDollar
    },
    {
      title: 'Assets',
      url: '/dashboard/assets',
      icon: FaCoins
    }
  ];

  const analyticsItems = [
    {
      title: 'Categories',
      url: '/dashboard/categories',
      icon: FaTags
    },
    {
      title: 'Payees',
      url: '/dashboard/payees',
      icon: FaUsers
    },
    {
      title: 'Financial Health',
      url: '/dashboard/health',
      icon: FaHeart
    },
    {
      title: 'AI Advisor',
      url: '/dashboard/ai-advisor',
      icon: FaRobot
    }
  ];

  return (
    <Sidebar collapsible='icon'>
      {/* Sidebar ambient glow */}
      <div className='pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-primary/10 blur-[80px]' />
      <SidebarHeader className='h-16 border-b border-sidebar-border flex items-center justify-start px-2'>
        <div className='flex items-center gap-3 w-full'>
          <div className='flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shrink-0'>
            <FaMoneyBillTransfer className='h-6 w-6' />
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
                    onClick={() => navigate(item.url)}
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
                    onClick={() => navigate(item.url)}
                    isActive={pathname === item.url || (item.url !== '/' && pathname.startsWith(item.url))}
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
                    onClick={() => navigate(item.url)}
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
                    onClick={() => navigate(item.url)}
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
                      baseTheme: shadcn,
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
