'use client';

import React from 'react';
import { useUser } from '@clerk/nextjs';

import { Skeleton } from '@/components/ui/skeleton';

function HeaderWelcome() {
  const { isLoaded, user } = useUser();

  return (
    <div className='pt-10'>
      {isLoaded && user?.firstName ? (
        <>
          <h1 className='text-2xl lg:text-5xl font-medium mb-3 text-primary'>Welcome, {user?.firstName} 👋</h1>
          <p className='mb-3 text-primary'>This is your financial overview report</p>
        </>
      ) : (
        <>
          <Skeleton className='h-8 lg:h-12 w-full md:w-1/2 mb-3' />
          <Skeleton className='h-6 w-full md:w-1/3 mb-3' />
        </>
      )}
    </div>
  );
}

export default HeaderWelcome;
