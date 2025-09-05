import Header from '@/components/Header';
import Filters from '@/components/Filters';
import HeaderWelcome from '@/components/HeaderWelcome';
import { SidebarInset } from '@/components/ui/sidebar';

type Props = {
  children: React.ReactNode;
};

function DashboardLayout({ children }: Props) {
  return (
    <>
      <Header />
      <SidebarInset className='px-5'>
        <header className='px-2 py-2'>
          <div className='container mx-auto'>
            <HeaderWelcome />
            <Filters />
          </div>
        </header>
        <main>{children}</main>
      </SidebarInset>
    </>
  );
}

export default DashboardLayout;
