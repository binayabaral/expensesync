'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';

import { Skeleton } from '@/components/ui/skeleton';

function HeaderWelcome() {
  const { isLoaded, user } = useUser();

  return (
    <div className='min-w-0'>
      {isLoaded && user?.firstName ? (
        <div>
          <h1 className='text-lg font-bold tracking-tight truncate'>Welcome back, {user?.firstName}! 👋</h1>
          <p className='text-xs text-muted-foreground'>Here&apos;s an overview of your finances</p>
        </div>
      ) : (
        <div className='space-y-1'>
          <Skeleton className='h-5 w-48' />
          <Skeleton className='h-3 w-40' />
        </div>
      )}
    </div>
  );
}

export default HeaderWelcome;
