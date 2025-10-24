import Header from '@/components/Header';

type Props = {
  children: React.ReactNode;
};

function DashboardLayout({ children }: Props) {
  return (
    <div className='min-h-screen bg-gradient-to-b from-slate-50 to-slate-100'>
      <Header />
      <main>{children}</main>
    </div>
  );
}

export default DashboardLayout;
