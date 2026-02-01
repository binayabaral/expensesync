import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Separator } from '@/components/ui/separator';
import Filters from '@/components/Filters';
import HeaderWelcome from '@/components/HeaderWelcome';

type Props = {
  children: React.ReactNode;
};

async function DashboardLayout({ children }: Props) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state');
  const defaultOpen = sidebarState?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset className='overflow-x-hidden'>
        <div className='sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4'>
          <SidebarTrigger className='-ml-1 shrink-0' />
          <Separator orientation='vertical' className='h-6 shrink-0' />
          <div className='hidden lg:block flex-1 min-w-0'>
            <HeaderWelcome />
          </div>
          <div className='flex-1 lg:flex-none'>
            <Filters />
          </div>
        </div>
        <main className='p-4 h-[calc(100vh-4rem)] overflow-auto'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default DashboardLayout;
