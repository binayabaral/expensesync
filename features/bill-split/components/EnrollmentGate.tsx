'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useGetEnrollment } from '../api/useGetEnrollment';
import { EnrollmentScreen } from './EnrollmentScreen';

export function EnrollmentGate({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetEnrollment();

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-8 w-48' />
        <Skeleton className='h-32 w-full' />
        <Skeleton className='h-32 w-full' />
      </div>
    );
  }

  if (!data?.enrolled) {
    return <EnrollmentScreen />;
  }

  return <>{children}</>;
}
