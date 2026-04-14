import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SheetProvider } from '@/providers/SheetProvider';
import { Separator } from '@/components/ui/separator';
import Filters from '@/components/Filters';
import HeaderWelcome from '@/components/HeaderWelcome';
import { ThemeToggle } from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

type Props = {
  children: React.ReactNode;
};

async function DashboardLayout({ children }: Props) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state');
  const defaultOpen = sidebarState?.value === 'true';

  return (
    <SheetProvider>
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className='print:hidden contents'>
        <AppSidebar />
      </div>
      <SidebarInset className='overflow-x-hidden print:ml-0 print:w-full'>
        {/* Ambient glow blobs */}
        <div className='print:hidden pointer-events-none fixed -bottom-40 -left-40 h-100 w-100 rounded-full bg-primary/8 blur-[100px]' />
        <div className='print:hidden pointer-events-none fixed bottom-0 left-1/2 -translate-x-1/2 h-80 w-180 rounded-full bg-primary/5 blur-[100px]' />

        <div className='print:hidden sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 backdrop-blur-md px-4'>
          <SidebarTrigger className='-ml-1 shrink-0' />
          <Separator orientation='vertical' className='h-6 shrink-0' />
          <div className='hidden lg:block flex-1 min-w-0'>
            <HeaderWelcome />
          </div>
          <div className='flex items-center gap-2 ml-auto'>
            <ThemeToggle />
            <Filters />
          </div>
        </div>
        <main className='p-4 h-[calc(100vh-4rem)] overflow-hidden flex flex-col'>{children}</main>
      </SidebarInset>
    </SidebarProvider>
    </SheetProvider>
  );
}

export default DashboardLayout;
